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
                allOf {
                    expression { return env.CHANGE_ID != null }
                    expression { return env.CHANGE_TARGET == 'main' }
                }
            }

            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'Aspen',
                        usernameVariable: 'GITHUB_USER',
                        passwordVariable: 'GITHUB_TOKEN'
                    )
                ]) {
                    // JSON is parsed with node, so jq is not required on the agent
                    sh '''
                        set -e

                        echo "===================================================="
                        echo "                 Checking Pull Request"
                        echo "===================================================="

                        PR_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${CHANGE_ID}"

                        get() { node -p "require('./github_pr.json').$1"; }

                        # GitHub computes "mergeable" asynchronously; it is null right after a push
                        for i in 1 2 3 4 5 6; do
                            curl -sS \
                                -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                                -H "Accept: application/vnd.github+json" \
                                -H "X-GitHub-Api-Version: 2022-11-28" \
                                "${PR_URL}" > github_pr.json

                            MERGEABLE=$(get mergeable)
                            [ "$MERGEABLE" != "null" ] && break
                            echo "Mergeable state not computed yet (attempt $i), retrying in 5s..."
                            sleep 5
                        done

                        echo "PR information:"
                        echo "  number:          $(get number)"
                        echo "  title:           $(get title)"
                        echo "  state:           $(get state)"
                        echo "  draft:           $(get draft)"
                        echo "  mergeable:       ${MERGEABLE}"
                        echo "  mergeable_state: $(get mergeable_state)"
                        echo "  head:            $(get head.ref)"
                        echo "  base:            $(get base.ref)"

                        STATE=$(get state)
                        DRAFT=$(get draft)

                        if [ "$STATE" != "open" ]; then
                            echo "ERROR: PR is not open."
                            exit 1
                        fi

                        if [ "$DRAFT" = "true" ]; then
                            echo "ERROR: PR is still a draft."
                            exit 1
                        fi

                        if [ "$MERGEABLE" != "true" ]; then
                            echo "ERROR: PR is not mergeable (mergeable=${MERGEABLE})."
                            exit 1
                        fi

                        echo "PR is open and mergeable."
                    '''
                }
            }
        }

        stage('Auto-Merge') {
            when {
                allOf {
                    expression { return env.CHANGE_ID != null }
                    expression { return env.CHANGE_TARGET == 'main' }
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
                            credentialsId: 'Aspen',
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
                            cat merge_response.json
                            echo ""

                            if [ "${HTTP_CODE}" != "200" ]; then
                                echo "ERROR: GitHub merge request failed."
                                exit 1
                            fi

                            MERGED=$(node -p "require('./merge_response.json').merged")

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

    post {
        success {
            echo "Pipeline completed successfully."
        }

        failure {
            echo "Pipeline failed — PR will not be merged."
        }

        always {
            script {
                if (env.NODE_NAME) {
                    cleanWs()
                }
            }
        }
    }
}