#! /bin/bash -e

set -x

docker pull google/cadvisor:latest
docker pull centurylink/panamax-api:latest
docker pull centurylink/panamax-ui:latest

docker pull cgeoffroy/nginx-auto_cert

sync
