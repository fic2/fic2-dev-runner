#! /bin/bash -e

set -x

docker pull google/cadvisor:latest
# docker pull centurylink/panamax-api:latest
# docker pull centurylink/panamax-ui:latest
docker pull fic2/panamax-api
docker pull fic2/panamax-ui


docker pull cgeoffroy/nginx-auto_cert

docker pull fic2/ppnet
docker pull mysql
docker pull wordpress

sync
