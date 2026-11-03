# AWS deployment plan — issue #13

Planning only. No AWS account, credit balance, infrastructure, domain ownership or deployment has been verified by this document. No CloudFormation template or cloud resource was created during this planning task. The canonical implementation issue is https://github.com/mjesenuly/mvp/issues/13 .

## Proposed scope and prerequisites

Continue the tested RepairLens image and PostgreSQL Compose stack on **one EC2 host in one Availability Zone**. This is a small coursework deployment with operational safeguards, not high availability or a managed-database architecture. Do not add RDS, a NAT gateway, a load balancer, Kubernetes or a second application replica.

Before provisioning, verify the actual AWS account identity, **Free account plan**, expiry/remaining credits, permitted Region and resource availability. AWS currently describes a new-customer $100 starting credit, possible additional earned credits, and a Free-plan lifetime ending after six months or credit exhaustion. These are eligibility rules, not evidence of this user's balance. Never upgrade to Paid, enable paid support, join Organizations, or activate advanced features to get around a restriction. If the required IAM/networking operation is unavailable on the actual Free-plan account, report a blocker and retain the prepared files. [AWS plan rules](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html), [supported new-experience services](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html).

Required inputs: account/Region; available VPC and public subnet or authority to create the minimal network below; an owned hostname with DNS-change access; verified tested image digest; GitHub repository `mjesenuly/mvp`; runtime admin email and securely supplied bootstrap secrets. Account/payment setup remains private to the user. Do not ask for passwords, payment-card details or long-lived AWS keys in chat.

## Concrete resource inventory

| Resource | Proposed setting and purpose |
| --- | --- |
| EC2 host | Amazon Linux 2023 x86-64, one `t3.small` recommended for 2 GiB RAM; `t3.micro` (1 GiB) only after measured memory/load checks. IMDSv2 required; no SSH key required. |
| Root EBS | Approximately 12 GiB encrypted gp3 for OS, Docker images and bounded logs; ordinary host lifecycle. |
| Data EBS | Approximately 8 GiB encrypted gp3 in the host's AZ. Persist PostgreSQL and proxy certificate data; `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`. Explicit backup before replacement. |
| Network | One VPC, public subnet, internet gateway, route table and association if not reusing an eligible existing network. No NAT gateway or paid interface endpoints. |
| Address | One Elastic IP for stable DNS. It consumes public-IPv4 usage even while idle; do not leave untracked addresses after teardown. |
| Security group | Public TCP 80 for ACME/HTTPS redirect and TCP 443 for the app. No ingress 22, 3000 or 5432. App and database communicate on private Compose networks. |
| Instance profile | SSM managed-node communication plus access to only the required application secret/configuration path. No administrator permissions. |
| GitHub deployment role | OIDC trust restricted to this repository and deployment branch/environment; permission to execute only the RepairLens deployment document against the intended host. |
| SSM deployment document | A bounded deployment routine that accepts a validated image identifier, backs up, stops the previous single writer, starts the tested replacement and verifies readiness. |
| Runtime configuration | Standard Parameter Store SecureString parameters supplied separately through an authenticated private workflow; root-readable runtime environment file with mode `0600`. |

Use `t3.small` as the initial engineering recommendation, not a confirmed user choice. A 1-GiB machine has little headroom for OS, PostgreSQL, proxy, Node and photo/state copying. For the 2-GiB host, initially budget about 512 MiB app, 512 MiB database and 128 MiB proxy, leaving OS headroom; verify actual limits and PostgreSQL settings under the demonstration workload. Set T3 CPU credit mode to **standard** to avoid surplus-credit consumption, accepting possible throttling. Build/type-check/test images on GitHub Actions, never on the small production VM. [T3 specifications](https://aws.amazon.com/ec2/instance-types/t3/), [current EC2 Free Tier eligibility](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).

## Deployment and storage design

Use an immutable tested GHCR image digest (and a commit-SHA tag for traceability). Initially a public non-secret image avoids storing registry credentials on the host; inspect the build context and published image for secrets first. Pin PostgreSQL and proxy versions, and record their digests for reproducible releases.

The production Compose override must mount database and Caddy certificate directories from the **attached data EBS filesystem**, not accidentally leave Docker named volumes on the replaceable root disk. Mount by a stable filesystem/volume identity; format only a verified new, empty data volume. An existing retained volume must never be formatted by bootstrap. Database port 5432 remains unpublished. The proxy is the only publicly bound service; backend port 3000 remains private.

Caddy can terminate HTTPS for the user-controlled hostname and forward to the app. Require valid DNS and certificate issuance before claiming HTTPS. Set production mode, secure cookies and exact `APP_ORIGIN`. A raw HTTP IP demonstration is not evidence of the required production HTTPS setup. This hostname/proxy choice is a recommendation; certificate behavior must be verified from current Caddy documentation during implementation.

The existing PostgreSQL adapter holds a lifetime advisory single-writer lock. A deployment therefore **stops and drains the old application before starting the new one**, while retaining the database. Configure overlap as zero; accept a short maintenance window. Do not claim rolling zero-downtime updates. Concurrent CI deployment jobs must be serialized. Release database migrations only after the previous writer exits; let readiness fail closed on database errors.

## IAM, secrets and remote access

GitHub OIDC trust should use audience `sts.amazonaws.com` and the exact subject `repo:mjesenuly/mvp:ref:refs/heads/main`, or the exact protected deployment-environment subject if GitHub Environments is deliberately used. Do not use a repository/organization wildcard. Grant `id-token: write` only in the deployment job and keep PR jobs unable to assume the production role. [AWS GitHub OIDC guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html).

Separate initial infrastructure bootstrap permissions from routine releases. Routine CI needs scoped `ssm:SendCommand` on one approved document and the tagged host/instance ARN, plus bounded result/status reads. It does not need IAM administration, arbitrary shell-document access, secret retrieval or broad CloudFormation create/delete permissions. IAM actions whose AWS API lacks resource-level scoping must be documented individually rather than hidden inside `Action: *`. [Run Command policy guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command-setting-up.html).

Prefer SSM Session Manager/Run Command over exposed SSH. The host needs working outbound HTTPS/DNS to SSM, package/image registries and certificate services. Verify the selected AMI's SSM agent, instance profile and account availability. [Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html), [IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html).

Do not put secrets in EC2 user data, command parameters, GitHub logs, image layers or CloudFormation outputs. Secure dynamic references are **not supported in EC2 UserData**; `NoEcho` is not a substitute for a safe bootstrap. Instead pass parameter **names**, and let the instance retrieve the small allowed SecureString path at runtime using its role without shell tracing or echoing values. Standard Parameter Store has no parameter-storage charge, but KMS/API usage can still consume credits. Avoid a new customer-managed KMS key unless a verified requirement justifies its additional cost. [CloudFormation dynamic-reference limits](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html), [Parameter Store pricing](https://aws.amazon.com/systems-manager/pricing/).

## Backup, rollback and teardown acceptance criteria

- Before each schema-changing release, create an encrypted, timestamped PostgreSQL logical backup and record its compatible application SHA. Keep a bounded retention count. A backup only on the same VM/volume is insufficient for disaster recovery: obtain an offline copy or a separately retained snapshot/export within the verified allowance.
- Perform a real restore drill into an isolated disposable database, checking row counts, relationships, accepted terms, history and a login/session journey. Never restore over the only live copy as a test.
- Record the previous tested image and release manifest. Image rollback is safe only when the database schema remains compatible. For incompatible migrations, stop the app and use an explicitly reviewed restore/forward-fix procedure; never promise `docker compose` image rollback reverses database migrations.
- Preserve the data volume on stack deletion/replacement. Retained volumes/snapshots continue consuming credits and need an inventory with resource IDs. Teardown must remove compute/network/address resources, then separately offer intentional disposal of retained data and backups after export. Never silently delete user data to make a cleanup checklist green. [CloudFormation retention](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html), [replacement retention](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html).
- Verify actual stack events, SSM command results, public HTTPS health, browser smoke and restart persistence. Keep issue #13 open if only template validation succeeded or account/domain access remains blocked.

## Indicative usage estimate and monitoring

The following is a planning estimate from AWS's published Linux US East (N. Virginia) rates, not an account quote or promise of zero credit usage. Verify Region/prices and remaining credits immediately before provisioning.

| Monthly planning factor (730 hours) | `t3.micro` option | Recommended `t3.small` option |
| --- | ---: | ---: |
| Compute at $0.0104/$0.0209 per hour | $7.59 | $15.26 |
| One public IPv4 at $0.005/hour | $3.65 | $3.65 |
| 20 GiB total gp3 at illustrative $0.08/GiB-month | $1.60 | $1.60 |
| Indicative base subtotal | **$12.84** | **$20.51** |

Excluded: snapshots/backups, internet egress, DNS/domain registration, KMS/API/logging usage and any other account resources. Do not provision extra IOPS/throughput. Short demonstration use prorates runtime/storage usage, while retained storage can outlive the instance. [EC2 rates](https://aws.amazon.com/ec2/instance-types/t3/), [public IPv4 pricing](https://aws.amazon.com/vpc/pricing/), [EBS pricing](https://aws.amazon.com/ebs/pricing/).

Track remaining credits and Free-plan expiry; use available budget/credit alerts and a documented shutdown date. Alerts are notifications, not a hard spending cap. The actual Free-plan restriction is essential; credits on a Paid account would not meet the user's instruction. No infrastructure has been provisioned or billing eligibility verified by this plan.
