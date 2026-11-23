package com.trinh.english_center_be.shared.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * HTTP caching with ETag for rarely-changing GET endpoints. The filter hashes the response body into an
 * {@code ETag}; when the client sends the same value back in {@code If-None-Match} and the data is unchanged,
 * the server answers {@code 304 Not Modified} without a body.
 */
@Configuration
public class HttpCacheConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> listEtagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        // Exact list URLs only: /courses/schedule, /courses/{id}/students etc. are not matched on purpose.
        registration.addUrlPatterns("/categories", "/roles", "/courses", "/teachers");
        registration.setName("listEtagFilter");
        return registration;
    }
}
