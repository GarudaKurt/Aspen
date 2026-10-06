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
                    if node -e "process.exit(require('./package.json').scripts?.test ? 0 : 1)"; then
                        pnpm run test
                    else
                        echo "No test script configured; skipping tests."
                    fi
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

        stage('Check PR') {
            when {
                expression {
                    return env.CHANGE_ID != null
                }
            }

            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'automation',
                        usernameVariable: 'GITHUB_USER',
                        passwordVariable: 'GITHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "===================================================="
                        echo "                 Checking Pull Request"
                        echo "===================================================="

                        curl -sS \
                            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                            -H "Accept: application/vnd.github+json" \
                            -H "X-GitHub-Api-Version: 2022-11-28" \
                            "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${CHANGE_ID}" \
                            > github_pr.json

                        echo "PR information:"

                        jq '{
                            number,
                            title,
                            state,
                            draft,
                            mergeable,
                            mergeable_state,
                            head: .head.ref,
                            base: .base.ref
                        }' github_pr.json

                        STATE=$(jq -r '.state' github_pr.json)
                        DRAFT=$(jq -r '.draft' github_pr.json)
                        MERGEABLE=$(jq -r '.mergeable' github_pr.json)

                        if [ "$STATE" != "open" ]; then
                            echo "ERROR: PR is not open."
                            exit 1
                        fi

                        if [ "$DRAFT" = "true" ]; then
                            echo "ERROR: PR is still a draft."
                            exit 1
                        fi

                        if [ "$MERGEABLE" = "false" ]; then
                            echo "ERROR: PR is not mergeable."
                            exit 1
                        fi

                        echo "PR is open and mergeable."
                    '''
                }
            }
        }
        stage('Auto-Merge') {
            when {
                expression {
                    return env.CHANGE_ID != null
                }
            }

            steps {
                script {
                    echo "===================================================="
                    echo "                  Auto-Merge PR"
                    echo "===================================================="
                    echo "PR #${env.CHANGE_ID}"
                    echo "Target: ${env.CHANGE_TARGET}"
                    echo "All required checks passed."
                    echo "Attempting to merge..."
                    echo "===================================================="

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'automation',
                            usernameVariable: 'GITHUB_USER',
                            passwordVariable: 'GITHUB_TOKEN'
                        )
                    ]) {
                        sh '''
                            set -e

                            echo "Sending merge request to GitHub..."

                            HTTP_CODE=$(curl -sS \
                                -o merge_response.json \
                                -w "%{http_code}" \
                                -X PUT \
                                -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                                -H "Accept: application/vnd.github+json" \
                                -H "X-GitHub-Api-Version: 2022-11-28" \
                                -H "Content-Type: application/json" \
                                --data '{"merge_method":"squash"}' \
                                "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${CHANGE_ID}/merge")

                            echo "GitHub HTTP status: ${HTTP_CODE}"
                            echo "GitHub merge response:"
                            jq . merge_response.json

                            if [ "${HTTP_CODE}" != "200" ]; then
                                echo "ERROR: GitHub merge request failed."
                                exit 1
                            fi

                            MERGED=$(jq -r '.merged' merge_response.json)

                            if [ "${MERGED}" = "true" ]; then
                                echo "PR #${CHANGE_ID} successfully merged."
                            else
                                echo "ERROR: GitHub did not merge the PR."
                                exit 1
                            fi
                        '''
                    }
                }
            }
        }
    }
}