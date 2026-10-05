pipeline {
    agent {
        label 'agent-aspen'
    }

    options { 
        buildDiscarder(
            logRotator(
                numToKeepStr: '20',
                artifactNumToKeepStr: '10'
            )
        )
    }

    envinronment {
        REPO_OWNER = 'GarudaKurt'
        REPO_NAME = 'Aspen'
    }

    stages{
        stage('PR Info') {
            steps {
                echo "================================================="
                echo "             Pull Request Info                   "
                echo "================================================="
                echo "PR Number:       #${env.CHANGE_ID}                "
                echo "Title:           ${env.CHANGE_TITLE}              "
                echo "Source:          ${env.CHANGE_BRANCH}             "
                echo "Target:          ${env.CHANGE_TARGET}             "
                echo "================================================="
            }
        }
    }
}