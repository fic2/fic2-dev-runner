# How to

This cloud-init yaml file can create an example instance with the custom Runner's panamax.
To start an instance, use the command:


```
nova boot --flavor 'm1.medium' --image 'b46e5ad3-d9c2-45a7-ac97-c8593ca0a9a6' --key-name 'a_key' --user-data 'fallback_panamax-example.yaml' --security-groups 'fic2lab-fallback_runner_panamax-sg' --nic 'net-id=3dccc622-7200-40be-b523-0f73674db0e7' 'fic2lab-fallback_runner_panamax'
```

The application should be accessible on the port `3000`.


The `fic2lab-fallback_runner_panamax-sg` security group should contain the rules:
* For production:
  * 22
  * 3000
  * 3001
  * 3002
  * 49000-52000 range
* For development:
  * 22
  * 80
  * 443
  * 8000
  * 8080
  * 3000
  * 3001
  * 3002
  * 6001
  * 6002
  * 49000-52000 range
