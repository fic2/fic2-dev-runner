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


## Development

### Building the base development image

Two Dockerfiles are provided to build a complete environment for developing.
They allow to dynamically code into the application while seeing the update live.

First, go into the `etc/docker/nginx` directory and call the `./build.sh` script.
After completion, a `fic2-dhub-nginx` docker image will have been created.

Then, go into the `etc/docker/dev` directory and call the `./build.sh` script.
After completion, a `fic2-dhub-dev` docker image will have been created.

## Live coding

This requires 3 ssh terminals:
* The Runner app
* The server managing the OAuth2 workflow
* The nginx server for ssl offloading

First go into the root directory `fic2-dev-runner`.

* In the first terminal, call the `./dev.sh` scritp to start a terminal running in a Docker container. This containers has all the required tools (nodejs, npm, grunt) for developing.
  * `npm install` will fetch all the latest tools (server side).
  * `bower install` will fetch and install every librairies used in the Runner (browse side).
  * `grunt serve` will start an Express server distributing the Runner with a livereload feature.
* In the second terminal, call the `./dev-idm_hack.sh` script to start a terminal containing the nodejs environment.
  * go into the `idm` directory.
  * `npm install` to fetch all the dependencies.
  * `node app.js` to start the server
* In the third terminal:
  * go into the `etc/docker/nginx` directory
  * call the `./launch.sh` script to start the nginx server.


Now you should be able to browse the Runner on your development server (port 443).
Don't forget to update the `src/app/config.json` file with the correct OAuth parameters.

