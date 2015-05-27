FROM node:0.10.35

RUN apt-get -y install ca-certificates wget \
    && curl -SLO http://nginx.org/download/nginx-1.7.10.tar.gz \
    && tar -xvf nginx-1.7.10.tar.gz \
    && rm nginx-1.7.10.tar.gz \
    && cd nginx-1.7.10 \
    && ./configure --with-http_ssl_module --with-http_spdy_module --with-http_gzip_static_module --with-http_auth_request_module \
    && make \
    && make install \
    && mkdir /var/log/nginx \
    && ln -s /usr/local/nginx/sbin/nginx /usr/sbin/nginx \
    && wget https://godist.herokuapp.com/projects/ddollar/forego/releases/current/linux-amd64/forego -P /usr/local/bin \
    && chmod +x /usr/local/bin/forego

ADD src /tmp/src/
ADD idm /tmp/idm/

RUN cd /tmp/src \
    && npm install -g grunt-cli bower \
    && npm install \
    && bower --allow-root --config.interactive=false install \
    && grunt build \
    && cd /tmp/idm \
    && npm install

RUN mkdir -p /usr/share/nginx/html \
    && mv -T /tmp/src/dist /usr/share/nginx/html

RUN rm -rf nginx-1.7.10
#/tmp/src

RUN sed -r -i 's/["]redirect-uri.+/"redirect-uri": "http:\/\/runner.developer.mediafi.org\/#!\/create",/g' /usr/share/nginx/html/config.json \
    && sed -r -i 's/["]client-id.+/"client-id": "2230",/g' /usr/share/nginx/html/config.json

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log \
    && adduser --disabled-password --gecos '' nginx \
    && ln -s /usr/local/nginx/conf /etc/nginx

VOLUME ["/var/cache/nginx"]

ADD prod/nginx /usr/local/nginx/conf
ADD prod/Procfile /etc/

EXPOSE 80 443

WORKDIR /tmp/idm

CMD ["/usr/local/bin/forego", "start", "-f", "/etc/Procfile"]