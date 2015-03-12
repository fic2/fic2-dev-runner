#! /bin/bash -e

set -x

# id
# mkdir -p /home/core/.ssh
# cat id_rsa.pub >> /home/core/.ssh/authorized_keys

sudo mkdir -p /etc/systemd/system/docker.service.d
sudo cp 50-insecure-registry.conf /etc/systemd/system/docker.service.d/
sudo systemctl daemon-reload
sudo systemctl restart docker.socket docker.service


docker pull google/cadvisor:latest && sync && sleep 1s
docker pull fic2/panamax-api && sync && sleep 1s
docker pull fic2/panamax-ui && sync && sleep 1s
docker pull cgeoffroy/nginx-auto_cert && sync && sleep 1s
docker pull fic2/ppnet && sync && sleep 1s
docker pull mysql && sync && sleep 1s
docker pull wordpress && sync && sleep 1s


sudo mkdir -p /etc/systemd/journald.conf.d
sudo cp 50-limit-journal-size.conf /etc/systemd/journald.conf.d
sudo rm -rf /etc/systemd/system/docker.service.d
sudo systemctl daemon-reload
sudo systemctl restart docker.socket docker.service


sudo rm -rf /home/core/.ssh/* /root/.ssh/*
sudo rm /etc/ssh/ssh_host_*
#sudo systemctl restart sshd

sudo rm -rf /var/log/journal/*
sudo systemctl restart systemd-journald.service


rm -rf /home/core/src /tmp/script.sh /home/core/.bash_history

sync
