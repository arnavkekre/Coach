# Multi-Cloud System Architecture

Coach is engineered to deploy across **four distinct cloud architectures** across AWS and Microsoft Azure. Each architecture isolates frontend delivery, compute execution, container orchestration, and authentication to benchmark performance, cold-start latency, and operational cost.

---

## 1. Architecture Comparison Matrix

| # | Architecture Tier | Cloud | Frontend Infrastructure | Backend Compute | Identity Provider | Operational Cost | Current Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **1** | **AWS PaaS** | AWS | AWS Amplify Hosting | AWS Elastic Beanstalk (Python) | Supabase Auth | Low ($) | On-Demand Standby |
| **2** | **Azure PaaS** | Azure | Azure Static Web Apps | Azure App Service (Linux, B1) | Microsoft Entra ID / Supabase | **~$0/mo** | **ACTIVE (Live Demo)** |
| **3** | **AWS Enterprise Container** | AWS | AWS S3 + CloudFront CDN (`coachinterview.tech`) | AWS ECS Fargate + Application Load Balancer (ALB) | AWS Cognito User Pools | High ($$$) | On-Demand Standby (FinOps) |
| **4** | **Azure Cloud-Native Container** | Azure | Azure Blob Storage (`$web` static site) | Azure Container Apps (ACA - Korea Central) | Azure AD / Supabase | Medium ($$) | On-Demand Standby |

---

## 2. Deep Dive: The 4 Implementations

### Architecture 1: AWS PaaS Standard (Amplify + Elastic Beanstalk)
* **Frontend:** Deployed via **AWS Amplify CI/CD** connected to repository branch.
  * URL: `https://main.dfef58a7porfq.amplifyapp.com`
* **Backend:** Packaged with `Procfile` on **AWS Elastic Beanstalk** (Python 3.12 running on 64bit Amazon Linux 2023).
  * URL: `http://coach-backend-env.eba-82exqwu5.ap-south-1.elasticbeanstalk.com`
* **Characteristics:** Rapid deployment, fully managed OS patching, automatic scaling triggers.

---

### Architecture 2: Azure PaaS Standard (Static Web Apps + App Service) — *ACTIVE*
* **Frontend:** Deployed via GitHub Actions to **Azure Static Web Apps**.
  * URL: `https://thankful-plant-0e7dba400.2.azurestaticapps.net`
* **Backend:** **Azure App Service (Linux)** running FastAPI via Uvicorn on port 8000.
  * URL: `https://arnav-coach-student-2026.azurewebsites.net`
* **Characteristics:** Primary live demo environment. Zero active server cost. Exhibits cold-start latency (~20s) when idle on free/basic service plans.

---

### Architecture 3: AWS Enterprise Container Cluster (CloudFront + ECS Fargate)
* **Frontend:** Production build synced to private **Amazon S3** bucket behind **Amazon CloudFront CDN** with custom domain SSL.
  * Domain: `https://www.coachinterview.tech`
  * CloudFront Direct: `https://d36vtqnt7szogv.cloudfront.net`
* **Backend:** Dockerized FastAPI image pushed to **Amazon ECR** (`308657715435.dkr.ecr.ap-south-1.amazonaws.com/coach-backend`), orchestrated on **AWS ECS Fargate** across multiple Availability Zones behind an **AWS Application Load Balancer (ALB)**.
  * ALB Endpoint: `http://coach-alb-1029412538.ap-south-1.elb.amazonaws.com`
* **Identity:** Integrated with **AWS Cognito User Pools**.
* **FinOps Governance Note:** Deployed and validated in production. The ECS Fargate tasks and ALB are kept in on-demand standby to avoid continuous compute billing (~$35–$50/mo) on personal cloud credits.

---

### Architecture 4: Azure Cloud-Native Container Cluster (Storage Web + ACA)
* **Frontend:** Static asset bundle hosted in **Azure Blob Storage Static Website (`$web` container)**.
  * URL: `https://coachstaticstudent.z58.web.core.windows.net`
* **Backend:** Microservice container hosted on serverless **Azure Container Apps (ACA)** in region `Korea Central`, pulling images from **Azure Container Registry (ACR)**.
  * URL: `https://coach-backend-korea.nicepond-ae0bbb9d.koreacentral.azurecontainerapps.io`
* **Characteristics:** Serverless scale-to-zero container architecture with event-driven scale triggers.

---

## 3. FinOps & Operational Tradeoff Analysis

Rather than maintaining 4 redundant environments running 24/7, Coach utilizes a **FinOps-driven deployment model**:
1. **Architecture #2 (Azure PaaS)** remains permanently running as the zero-cost public evaluation endpoint.
2. **Architecture #3 (AWS Enterprise)** represents the high-throughput production design with ECS task definitions, ECR repositories, and CloudFront distributions maintained in code for on-demand spinning up.
3. **Architecture #1 and #4** demonstrate cloud provider portability (AWS PaaS vs. Azure Serverless Containers).
