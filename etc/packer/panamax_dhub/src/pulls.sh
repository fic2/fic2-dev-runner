#! /bin/bash -e

set -x

function pull {
    local F=$(mktemp)
    for i in $(seq 1 5); do
        echo '' > $F
        echo "$i: pulling $1"
        docker pull $1 2>&1 | tee $F
        echo "sync ..."
        sync
        if grep 'EOF' $F; then
            continue
        else
            break
        fi
    done
    rm $F
}

pull fic2/panamax-ui
pull google/cadvisor:latest
pull fic2/panamax-api
pull cgeoffroy/nginx-auto_cert
pull fic2/ppnet
pull mysql
pull wordpress
