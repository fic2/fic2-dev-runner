#! /bin/bash -e

set -x

# id
# mkdir -p /home/core/.ssh
# cat id_rsa.pub >> /home/core/.ssh/authorized_keys

#sudo mkdir -p /etc/systemd/system/docker.service.d
#sudo cp 50-insecure-registry.conf /etc/systemd/system/docker.service.d/
#sudo systemctl daemon-reload
#sudo systemctl restart docker.socket docker.service


./pulls.sh


sudo mkdir -p /etc/systemd/journald.conf.d
sudo cp 50-limit-journal-size.conf /etc/systemd/journald.conf.d
sudo rm -rf /etc/systemd/system/docker.service.d
sudo systemctl daemon-reload
#sudo systemctl restart docker.socket docker.service


sudo rm -rf /home/core/.ssh/* /root/.ssh/*
sudo rm /etc/ssh/ssh_host_*
#sudo systemctl restart sshd

sudo rm -rf /var/log/journal/*
sudo systemctl restart systemd-journald.service


rm -rf /home/core/src /tmp/script.sh /home/core/.bash_history

sync
