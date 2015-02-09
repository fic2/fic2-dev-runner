/* jshint camelcase: false */


'use strict';


angular.module('srcApp')
  .factory(
    'coreos',
    function() {

      var toObject = function() {
	return {
	  users: [
	    { name: 'core',
	      passwd: '$6$abcdefgh$VvtMG18kvqTA.xeyJk48ATU1C.rfF.uyg1Y0XY6D5trHYWYJCNolrnra45OVGpni37Bymb3XsWBS1I1hkxhy/1'
	    }
	  ],
	  write_files: [
	    { path: '/home/core/testo', content: 'azerty' }
	  ],
	  coreos: {
	    update: {
	      "reboot-strategy": 'off'
	    },
	    units: [
	      { name: 'docker.service',
		"drop-ins": [
		  { name: '50-insecure-registry.conf', // https://coreos.com/docs/cluster-management/setup/cloudinit-cloud-config/
		    content: [
		      '[Service]',
		      'Environment=\'DOCKER_OPTS=--registry-mirror="http://192.168.254.14:8080" --insecure-registry="0.0.0.0/0"\''
		    ].join('\n')
		  }
		]
	      },

	      // { name: 'docker.service', // /usr/lib/systemd/system/docker.service
	      // 	command: 'start',
	      // 	content: [
	      // 	  '[Unit]',
	      // 	  'Description=Docker Application Container Engine',
	      // 	  'Documentation=http://docs.docker.com',
	      // 	  'After=docker.socket early-docker.target network.target',
	      // 	  'Requires=docker.socket early-docker.target',
	      // 	  '[Service]',
	      // 	  'Environment=TMPDIR=/var/tmp',
	      // 	  'Environment=DOCKER_OPTS=\'--registry-mirror=http://192.168.254.14:8080 --insecure-registry="0.0.0.0/0"\'',
	      // 	  'EnvironmentFile=-/run/flannel_docker_opts.env',
	      // 	  'LimitNOFILE=1048576',
	      // 	  'LimitNPROC=1048576',
	      // 	  'ExecStart=/usr/lib/coreos/dockerd --daemon --host=fd:// $DOCKER_OPTS $DOCKER_OPT_BIP $DOCKER_OPT_MTU $DOCKER_OPT_IPMASQ',
	      // 	  '[Install]',
	      // 	  'WantedBy=multi-user.target'
	      // 	].join('\n')
	      // },

	      { name: 'fleet.service',
		command: 'start'
	      },
	      { name: 'panamax-metrics.service',
		command: 'start',
		content: [
		  '[Unit]',
		  'Description=Panamax Metrics',
		  'After=docker.service',
		  'Requires=docker.service',
		  '[Service]',
		  'ExecStartPre=-/usr/bin/docker kill PMX_CADVISOR',
		  'ExecStartPre=-/usr/bin/docker rm -f PMX_CADVISOR',
		  'ExecStart=/usr/bin/docker run --name=PMX_CADVISOR --rm=true --volume=/var/run:/var/run:rw --volume=/sys:/sys:ro --volume=/var/lib/docker/:/var/lib/docker:ro --publish=3002:8080 google/cadvisor:latest',
		  'ExecStop=/usr/bin/docker stop PMX_CADVISOR',
		  'Restart=always',
		  '[Install]',
		  'WantedBy=multi-user.target'
		].join('\n')
	      },
	      { name: 'panamax-api.service',
		command: 'start',
		content: [
		  '[Unit]',
		  'Description=Panamax API',
		  'After=docker.service',
		  'Requires=docker.service',
		  '[Service]',
		  'ExecStartPre=-/usr/bin/docker kill PMX_API',
		  'ExecStartPre=-/usr/bin/docker rm PMX_API',
		  'ExecStart=/usr/bin/docker run --name=PMX_API --rm=true -v /var/panamax-data:/usr/src/app/db/mnt -v /var/run/docker.sock:/run/docker.sock:rw  -e JOURNAL_ENDPOINT=http://10.0.42.1:19531 -e FLEETCTL_ENDPOINT=http://10.0.42.1:4001 -t -p 3001:3000 centurylink/panamax-api:latest',
		  'ExecStop=/usr/bin/docker stop PMX_API',
		  'Restart=always',
		  '[Install]',
		  'WantedBy=multi-user.target'
		].join('\n')
	      },
	      { name: 'panamax-ui.service',
		command: 'start',
		content: [
		  '[Unit]',
		  'Description=Panamax UI',
		  'After=panamax-api.service panamax-metrics.service',
		  '[Service]',
		  'ExecStartPre=-/usr/bin/docker kill PMX_UI',
		  'ExecStartPre=-/usr/bin/docker rm -f PMX_UI',
		  'ExecStart=/usr/bin/docker run --name=PMX_UI -v /var/run/docker.sock:/run/docker.sock:rw --link=PMX_API:PMX_API --link=PMX_CADVISOR:CADVISOR -e 3000 -p 3000:3000  centurylink/panamax-ui:latest',
		  'ExecStop=/usr/bin/docker stop PMX_UI',
		  'Restart=always',
		  '[Install]',
		  'WantedBy=multi-user.target'
		].join('\n')
	      }
	    ]
	  }
	};
      };

      return {
	toObject: toObject
      };
    }
  );