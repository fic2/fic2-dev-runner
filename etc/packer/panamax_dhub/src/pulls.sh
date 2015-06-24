#! /bin/bash -e

set -x

function loop {
    local F=$(mktemp)
    for i in $(seq 1 5); do
        echo '' > $F
        echo "$i: $1 '$2'"
        docker $1 $2 2>&1 | tee $F
        echo "sync ..."
        time sync
        if grep 'EOF' $F; then
            continue
        else
            break
        fi
    done
    rm $F
}

loop images ''

loop pull devmediafi/panamax-ui
loop pull google/cadvisor:latest
loop pull devmediafi/panamax-api
loop pull cgeoffroy/nginx-auto_cert
loop pull fic2/ppnet
loop pull mysql
loop pull wordpress

loop images ''
