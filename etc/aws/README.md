# Launch FIC2Lab runner on Amazon Web Services

## Launch

If you have an Amazon Web Services account, you can easily launch our preconfigured FIC2Lab runner based on Panamax.

<a href="https://console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/new?stackName=FIC2Lab&templateURL=https://s3-eu-west-1.amazonaws.com/fic2lab/panamax-cloudformation-ireland-nokey.json"><img src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"></a>

This will create in the Ireland region (eu-west-1) the following resources:
* a security group (named PanamaxSecurityGroup)
* a t2.medium Linux instance (named PanamaxEc2Instance)

Once the launch is complete, you will see the URL of your Panamax console in the outputs tab of the [AWS CloudFormation Console](https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1). You may have to wait a couple of minutes for the software installation to finish before it is available.

## Build

* Use Packer to build your own AMI image and make it public in a given AWS region: https://github.com/fic2/fic2-dev-runner/tree/geo/work/etc/packer/panamax_dhub
* Configure the cloud init data: https://github.com/fic2/fic2-dev-runner/tree/geo/work/etc/cloud-init
* Update the CloudFormation manifest here with:
 * The new AMI id
 * The cloud init data encoded in base64 (`cat input.yaml | base64 | tr -d '\n'`)
* To construct the launch stack URL, use the following general URL syntax:

```
https://console.aws.amazon.com/cloudformation/home?region=region#/stacks/new?stackName=stack_name&templateURL=template_location
```

The region parameter specifies where the stack will be created. If you don't specify a region, users are directed to the region they last used. The stack_name parameter is a unique name that identifies the stack. The template_location  parameter is the URL of the template file which must be located in a AWS S3 bucket and be public.

