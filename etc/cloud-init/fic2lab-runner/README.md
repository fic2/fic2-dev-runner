

```
nova boot --flavor 'm1.small' --image 'CoreOS_660.0.0' --key-name 'a_key_name' --user-data 'fic2lab-runner.yaml' --security-groups 'fic2lab-runner-sg' --nic 'net-id=b99da016-cb02-4556-8d5f-2ce27a9a861d' fic2lab-runner
```

Please note that the service will not be accessible right after the first boot. Because the instance needs to download the required Docker image.


```
nova floating-ip-associate  fic2lab-runner 111.222.333.444
```
