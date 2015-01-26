#! /bin/bash -e

docker run -it -p '9000:9000' -p '35729:35729' -u "$(id -u):$(id -u)" -e 'HOME=/tmp' --rm=true -v "$(pwd):/tmp/dev" -w '/tmp/dev' 'fic2-dhub-dev'