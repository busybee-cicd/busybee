library "BanzaiCICD@master"

banzai([
    appName: 'busybee',
    tools: [
        nodejs: '8.11.4'
    ],
    sshCreds: ['git-ssh'],
    build: [
        /PR\-(.*)/ : [
            shell: 'banzai-build.sh'
        ]
    ]
])