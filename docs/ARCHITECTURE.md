
# System Architecture & Multi-Cloud Strategy

Coach was engineered and validated across four distinct deployment targets to evaluate latency, cold-start characteristics, operational complexity, and infrastructure cost.

---

## Infrastructure Matrix

| Architecture | Compute / Hosting | Identity / Auth | CDN & Edge | Target Environment | Cost Profile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Arch 1: Cost-Optimized (Active)** | Azure App Service (FastAPI) | Microsoft Entra ID / Supabase | Azure Static Web Apps | Live Demo / Continuous Evaluation | **~$0/mo** (Cold-start tradeoff) |
| **Arch 2: High-Availability Cloud** | AWS ECS Fargate (Docker) + ALB | AWS Cognito | AWS S3 + CloudFront | Enterprise / High Concurrency | Pay-per-vCPU (On-demand standby) |
| **Arch 3: Hybrid Edge Delivery** | Azure App Service | Supabase Auth | AWS S3 + CloudFront (`coachinterview.tech`) | Global Edge Distribution | Low cost, high CDN performance |
| **Arch 4: Self-Hosted / On-Prem** | Docker Compose | Local / Supabase CLI | Nginx Reverse Proxy | Local Dev & Private Auditing | $0 (Hardware-bound) |

---

## Architectural Deep Dive

### Architecture 1: Cost-Optimized Azure Stack (Currently Live)
* **Frontend:** Azure Static Web Apps (or S3/CloudFront edge).
* **Backend:** Azure App Service (Linux container, Python 3.12, Uvicorn on port 8000).
* **Tradeoff Analysis:** Minimal operational cost. Small cold-start latency (~20s) if idle on basic tiers, mitigated by keep-alive pings.

### Architecture 2: AWS Enterprise Container Stack (ECS Fargate)
* **Compute:** Containerized FastAPI packaged via Docker, orchestrated on AWS ECS Fargate behind an Application Load Balancer (ALB).
* **Network & Security:** Isolated in private subnets across 2 Availability Zones with NAT Gateway egress for Supabase and Groq API calls.
* **Auth:** Integrated with AWS Cognito User Pools.
* **FinOps Governance Note:** *To prevent personal cloud credit exhaustion while maintaining reproducible enterprise capability, ECS Fargate task definitions and CloudFormation/Terraform manifests are archived in version control and spun up on-demand.*

### Architecture 3: Hybrid Edge (CloudFront + Azure)
* **Concept:** Leverages AWS CloudFront for sub-millisecond static file delivery on custom domain `coachinterview.tech`, with CORS-whitelisted asynchronous routing to Azure App Service for business logic and vector search.

### Architecture 4: Local Docker Orchestration
* **Concept:** Multi-container `docker-compose.yml` linking the FastAPI backend, Vite hot-reloading frontend, and local Supabase emulator for offline development and air-gapped evaluation.
