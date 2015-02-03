FROM nginx:1.7.9

RUN apt-get update -y && \
    apt-get install -y apg wget openssl && \
    wget -P /usr/local/bin http://stedolan.github.io/jq/download/linux64/jq && \
    chmod +x /usr/local/bin/jq


ADD nginx /etc/nginx
ADD boot.sh .

EXPOSE 80 443

CMD ["./boot.sh"]