#! /bin/bash -e

docker run -it -v '/dev/urandom:/dev/random' --rm=true --link='dhub:dhub' -p '80:80' -p '443:443' -p '35729:35729' --name 'dhub-nginx' 'fic2-dhub-nginx'