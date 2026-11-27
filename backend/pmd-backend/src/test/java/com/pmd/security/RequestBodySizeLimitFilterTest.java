package com.pmd.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestBodySizeLimitFilterTest {

    private final RequestBodySizeLimitFilter filter = new RequestBodySizeLimitFilter(16, noCors());

    private static org.springframework.beans.factory.ObjectProvider<org.springframework.web.cors.CorsConfigurationSource> noCors() {
        org.springframework.beans.factory.support.StaticListableBeanFactory factory = new org.springframework.beans.factory.support.StaticListableBeanFactory();
        return factory.getBeanProvider(org.springframework.web.cors.CorsConfigurationSource.class);
    }

    private MockHttpServletRequest json(byte[] body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/projects");
        request.setContentType("application/json");
        request.setContent(body);
        return request;
    }

    @Test
    void rejectsADeclaredBodyOverTheLimit() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(json(new byte[17]), response, chain);

        assertThat(response.getStatus()).isEqualTo(413);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void passesABodyWithinTheLimit() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(json(new byte[16]), response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void stopsAChunkedBodyOnceItReadsPastTheLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/projects") {
            @Override
            public long getContentLengthLong() {
                return -1; // chunked: no declared length
            }
        };
        request.setContentType("application/json");
        request.setContent(new byte[64]);
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        HttpServletRequest passed = (HttpServletRequest) chain.getRequest();
        assertThatThrownBy(() -> passed.getInputStream().readAllBytes()).isInstanceOf(IOException.class);
    }

    @Test
    void leavesMultipartUploadsToTheirOwnLimits() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/uploads/avatar");
        request.setContentType("multipart/form-data; boundary=x");
        request.setContent(new byte[1024]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }
}
