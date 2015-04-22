/* jshint camelcase: false */

// /etc/nginx/sites-enabled/hub.conf

'use strict';


angular.module('srcApp')
  .factory(
    'coreos',
    ['APP_CONFIG', function(APP_CONFIG) {

      var toObject = function() {
        var buildNginxServerConf = function(port, up) {
          return [
	    'server {',
	    'rewrite_log on;',
	    'listen       ' + port + ' ssl;',
	    'server_name  localhost;',
	    'error_page 497  https://$host:$server_port$request_uri;',
	    'ssl on;',
	    'ssl_certificate      /etc/nginx/cert/server.crt;',
	    'ssl_certificate_key  /etc/nginx/cert/server.key;',
	    'ssl_session_cache shared:SSL:1m;',
	    'ssl_session_timeout  5m;',
	    'ssl_ciphers  HIGH:!aNULL:!MD5;',
	    'ssl_prefer_server_ciphers   on;',
	    'location / {',
	    'proxy_pass http://' + up + ';',
	    'proxy_set_header Host $host; # nginx public ip',
	    'proxy_set_header X-Forwarded-Host $http_host; # same as the request HTTP_HOST',
	    'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; # browser ip',
	    'proxy_set_header X-Forwarded-Proto $scheme;',
	    'proxy_set_header X-Real-IP $remote_addr;',
	    '# add_header "Access-Control-Allow-Origin" "*";',
	    '# add_header "Access-Control-Allow-Methods" "*";',
	    '}',
	    '}'
          ];
        };

	return {
	  users: [
	    { name: 'core',
	      passwd: '$6$abcdefgh$VvtMG18kvqTA.xeyJk48ATU1C.rfF.uyg1Y0XY6D5trHYWYJCNolrnra45OVGpni37Bymb3XsWBS1I1hkxhy/1'
	    }
	  ],
	  write_files: [
	    { path: '/home/core/testo', content: 'azerty' },
	    { path: '/etc/systemd/resolved.conf.d/10-fix_dns.conf',
	      content: [
	      	'[Resolve]',
	      	'DNS=8.8.8.8',
	      	'FallbackDNS=8.8.4.4 193.52.45.190'		     
	      ].join('\n')
	    },
	    { path: '/home/core/hub.conf',
	      content: [
		'upstream up_panamax_api {',
		'server PMX_API:3000;',
		'}',
		'upstream up_panamax_ui {',
		'server PMX_UI:3000;',
		'}'
	      ].concat(buildNginxServerConf(6001, 'up_panamax_api'))
              .concat(buildNginxServerConf(6002, 'up_panamax_ui'))
              .join('\n')
	    }
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
		      'Environment=\'DOCKER_OPTS=--log-level="debug" --registry-mirror="http://' + APP_CONFIG['docker-hub-mirror']['public-ip'] + ':8080" --insecure-registry="0.0.0.0/0"\''
		    ].join('\n')
		  }
		]
	      },
	      // { name: 'systemd-journald.service',
	      // 	"drop-ins": [
	      // 	  { name: '50-limit-journal-size.conf',
	      // 	    content: [
	      // 	      '[Journal]',
	      // 	      'Compress=yes',
	      // 	      'SystemMaxUse=500M',
	      // 	      'SystemMaxFileSize=10M'
	      // 	    ].join('\n')
	      // 	  }
	      // 	]
	      // },

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

	      { name: 'systemd-journal-gatewayd.service',
	      	command: 'start'
	      },
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
		  'ExecStart=/usr/bin/docker run --name=PMX_CADVISOR --rm=true --volume=/var/run:/var/run:rw --volume=/sys:/sys:ro --volume=/var/lib/docker/:/var/lib/docker:ro --publish=3002:8080 google/cadvisor:latest -log_dir / --global_housekeeping_interval=30s --housekeeping_interval=17s',
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
		  '#ExecStart=/usr/bin/docker run --name=PMX_API --rm=true -v /var/panamax-data:/usr/src/app/db/mnt -v /var/run/docker.sock:/run/docker.sock:rw  -e JOURNAL_ENDPOINT=http://172.17.42.1:19531 -e FLEETCTL_ENDPOINT=http://172.17.42.1:4001 -t -p 3001:3000 centurylink/panamax-api:latest',
                  'ExecStart=/usr/bin/docker run --name=PMX_API --rm=true -v /var/panamax-data:/usr/src/app/db/mnt -v /var/run/docker.sock:/run/docker.sock:rw  -e JOURNAL_ENDPOINT=http://172.17.42.1:19531 -v /var/run/fleet.sock:/var/run/fleet.sock:rw -t -p 3001:3000 fic2/panamax-api:latest',
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
		  '#ExecStart=/usr/bin/docker run --name=PMX_UI --rm=true -v /var/run/docker.sock:/run/docker.sock:rw --link=PMX_API:PMX_API --link=PMX_CADVISOR:PMX_CADVISOR -e 3000 -p 3000:3000  centurylink/panamax-ui:latest',
                  'ExecStart=/usr/bin/docker run --name=PMX_UI --rm=true -v /var/run/docker.sock:/run/docker.sock:rw --link=PMX_API:PMX_API --link=PMX_CADVISOR:PMX_CADVISOR -e 3000 -p 3000:3000  fic2/panamax-ui:latest',
		  'ExecStop=/usr/bin/docker stop PMX_UI',
		  'Restart=always',
		  '[Install]',
		  'WantedBy=multi-user.target'
		].join('\n')
	      },
	      { name: 'panamax-api-nginx.service',
		command: 'start',
		content: [
		  '[Unit]',
		  'Description=Panamax Nginx frontend',
		  'After=panamax-api.service',
		  '[Service]',
		  'ExecStartPre=-/usr/bin/docker kill PMX_API_NGINX',
		  'ExecStartPre=-/usr/bin/docker rm -f PMX_API_NGINX',
		  'ExecStart=/usr/bin/docker run --name=PMX_API_NGINX --rm=true -t -v /dev/urandom:/dev/random -v /home/core/hub.conf:/etc/nginx/sites-enabled/hub.conf --link=PMX_API:PMX_API --link=PMX_UI:PMX_UI -e 6001 -p 6001:6001 -e 6002 -p 6002:6002 cgeoffroy/nginx-auto_cert:latest',
		  'ExecStop=/usr/bin/docker stop PMX_API_NGINX',
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
    }]
  );
