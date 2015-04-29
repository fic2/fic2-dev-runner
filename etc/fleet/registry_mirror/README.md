## How to launch a registry mirror instance on an OpenStack ##

A Cloud-Config file is located at 'etc/fleet/registry_mirror/registry-mirror.service.yaml'.
This configuration requires a cloud-init compatible infrastructure and a CoreOs image.

For example on a OpenStack, you can launch the registry mirror with (inside this directory):
```
nova boot --flavor 'm1.medium' --image 'CoreOS_660.0.0' --key-name 'a_key_name' --user-data 'registry-mirror.service.yaml' --security-groups 'docker-registry-mirror-sg' --nic 'net-id=b99da016-cb02-4556-8d5f-2ce27a9a861d' 'docker-registry-mirror'
```

Where 'b99da016-cb02-4556-8d5f-2ce27a9a861d' is the id of a private network.

For the 'docker-registry-mirror-sg' security group, the rules should be:
```
$ nova secgroup-list-rules docker-registry-mirror-sg
+-------------+-----------+---------+-----------+--------------+
| IP Protocol | From Port | To Port | IP Range  | Source Group |
+-------------+-----------+---------+-----------+--------------+
| tcp         | 8080      | 8080    | 0.0.0.0/0 |              |
| tcp         | 80        | 80      | 0.0.0.0/0 |              |
| tcp         | 22        | 22      | 0.0.0.0/0 |              |
+-------------+-----------+---------+-----------+--------------+
```

The port 8080 is bind the Docker registry mirror container.

A cadvisor service is present on the port 80 for monitoring.
