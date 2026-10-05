pipeline {
    agent any

    stages{
        stage('BUILD') {
            steps {
                sh '''
                    npm install
                '''
            }
        }
        stage('BUILD-APP') {
            steps{
                sh '''
                    npm run dev
                '''
            }
        }
    }
}