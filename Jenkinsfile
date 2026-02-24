pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: "25", artifactNumToKeepStr: "10"))
  }

  parameters {
    booleanParam(
      name: "DEPLOY",
      defaultValue: true,
      description: "Deploy containers after successful build checks."
    )
    booleanParam(
      name: "SMOKE_TEST",
      defaultValue: true,
      description: "Run HTTP health checks after deploy."
    )
    string(
      name: "ENV_FILE_CREDENTIALS_ID",
      defaultValue: "cb365-env-prod",
      description: "Optional Jenkins Secret file credential ID for project .env."
    )
    string(
      name: "COMPOSE_PROJECT_NAME",
      defaultValue: "cakesnbakes",
      description: "Docker Compose project name."
    )
  }

  environment {
    DOCKER_BUILDKIT = "1"
    COMPOSE_DOCKER_CLI_BUILD = "1"
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Preflight") {
      steps {
        sh """
          set -euo pipefail
          docker --version
          docker compose version
          node --version
          npm --version
          if ! docker info >/dev/null 2>&1; then
            echo "Docker daemon is not reachable from this Jenkins agent."
            echo "Ensure Jenkins can access /var/run/docker.sock (or a remote Docker daemon)."
            docker info
          fi
        """
      }
    }

    stage("Prepare Environment") {
      steps {
        script {
          if (params.ENV_FILE_CREDENTIALS_ID?.trim()) {
            withCredentials([file(credentialsId: params.ENV_FILE_CREDENTIALS_ID.trim(), variable: "JENKINS_ENV_FILE")]) {
              sh """
                set -euo pipefail
                cp "$JENKINS_ENV_FILE" .env
                chmod 600 .env
              """
            }
          } else {
            sh """
              set -euo pipefail
              cp .env.ci.example .env
              chmod 600 .env
            """
          }

          sh '''
            set -euo pipefail
            required_vars="ADMIN_USERNAME ADMIN_PASSWORD ADMIN_AUTH_SECRET ADMIN_VIEW_USER ADMIN_VIEW_PASSWORD"
            for var in $required_vars; do
              value="$(grep -E "^${var}=" .env | tail -n1 | cut -d= -f2- || true)"
              if [ -z "$value" ]; then
                echo "Missing required $var in .env"
                exit 1
              fi
            done
          '''
        }
      }
    }

    stage("Backend Static Check") {
      steps {
        sh """
          set -euo pipefail
          npm ci --prefix backend
          find backend/src -type f -name "*.js" -print0 | xargs -0 -r -n1 node --check
        """
      }
    }

    stage("Build Images") {
      steps {
        sh """
          set -euo pipefail
          COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" docker compose build --pull
        """
      }
    }

    stage("Deploy") {
      when {
        expression {
          return params.DEPLOY
        }
      }
      steps {
        sh """
          set -euo pipefail
          COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" docker compose up -d --build --remove-orphans
        """
      }
    }

    stage("Smoke Tests") {
      when {
        expression {
          return params.DEPLOY && params.SMOKE_TEST
        }
      }
      steps {
        sh """
          set -euo pipefail
          ./ci/wait_for_url.sh "http://localhost:4000/api/health" 60 2
          ./ci/wait_for_url.sh "http://localhost:8081/" 60 2
          ./ci/wait_for_url.sh "https://localhost/api/health" 60 2 --insecure
          admin_status_code=\$(curl --insecure --silent --output /dev/null --write-out "%{http_code}" https://localhost/admin)
          if [ "\$admin_status_code" != "401" ]; then
            echo "Expected /admin to be basic-auth protected (401), got HTTP \$admin_status_code"
            exit 1
          fi
        """
      }
    }
  }

  post {
    always {
      sh """
        set +e
        COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" docker compose ps
      """
    }
    failure {
      sh """
        set +e
        COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" docker compose logs --tail=120
      """
    }
  }
}
