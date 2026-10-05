pipeline {
    agent { label 'aspen-agent' }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
    }

    environment {
        REPO_OWNER = 'GarudaKurt'
        REPO_NAME  = 'Aspen'
        IMAGE_NAME = 'aspen'
    }

    stages {
        stage('PR Info') {
            when { changeRequest() }
            steps {
                echo "PR #${env.CHANGE_ID}: ${env.CHANGE_TITLE}"
                echo "${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}"
            }
        }

        stage('Install') {
            steps {
                sh '''
                    node -v
                    pnpm -v
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Lint & Test') {
            steps {
                sh '''
                    pnpm run lint
                    pnpm run test --if-present
                '''
            }
        }

        stage('Build Front-End') {
            steps {
                sh 'pnpm run build'
            }
        }

        // Enable once `docker ps` works inside WSL
        // stage('Docker Build') {
        //     steps {
        //         sh 'docker build -t ${IMAGE_NAME}:pr-${CHANGE_ID:-local}-${BUILD_NUMBER} .'
        //     }
        // }
    }
}