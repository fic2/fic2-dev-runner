#! /bin/bash -e

set -x

C=/etc/nginx/cert

if [ ! -d $C ]; then
    mkdir $C
    P=$(apg -n 1 -c "$RANDOM" -M SNCL -m 20 -x 22)
    echo -e "$P\n$P" | openssl genrsa -out "$C/server.key" 2048
    echo -e "\n\n\n\n\n\n\n\n\n" | openssl req -new -sha256 -key "$C/server.key" -out "$C/server.csr"
    openssl x509 -req -in "$C/server.csr" -signkey "$C/server.key" -out "$C/server.crt"
fi

wget "http://dhub:9000/config.json"

jq -r '.["cloud-uri"], .cors[] | "add_header \"Access-Control-Allow-Origin\" \"\(.)\";"' config.json > /etc/nginx/cors.conf
echo 'add_header "Access-Control-Allow-Methods" "*";' >> /etc/nginx/cors.conf


exec /usr/sbin/nginx -g 'daemon off;'