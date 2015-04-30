# About FIC2Lab Runner #


TODO


## Managing the OAuth configuration ##

These steps are explained using the graphical UI on https://account.lab.fiware.org/home.
The process can be replicated on any OAuth provider using a Rest Api.


## Creating the OAuth application ##

A Runner OAuth application must be created. To do so, login on the https://account.lab.fiware.org/home page and Register the 'FIC2Lab runner' application.

The Url should refer to the server where the final application will be hosted, it can be an ip or a domain name (for example 'http://runner.developer.mediafi.org').

The Callback Url is used during the OAuth protocol to redirect the authenticated user to the application. It should point to a specific page handling this case, for example: 'http://runner.developer.mediafi.org/#!/create'.


## Updating the OAuth application ##

### On the OAuth provider side ###

When the server hosting the Runner change location, it can be necessary to update the OAuth entries located at 'https://account.lab.fiware.org/applications/fic2lab-runner'.
This update can be ignored it the server is bound to a dns name.

### On the Runner side ###

The Runner configuration file contains some fields related to the OAuth protocol.
This file is located at 'src/app/config.json'.
Currently this file contains information to use a dev profile on Fiware.

When used on production the Runner is launched with a custom config.json file.
In this case, the file is located on the server at: '/home/core/config.json'.
Because this file is  mounted as volume, the changes are automatically applied for the Runner.
If not, the Runner can be restarted with the command:
```
sudo systemctl restart fic2lab-runner.service
```
