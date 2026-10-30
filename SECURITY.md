# Security / 安全说明

## Trust model / 可信模型

This project is intended for trusted local operators and projects. It is not a sandbox, identity system, tamper-proof audit log, distributed lock, or proof that review or tests occurred. The unsigned ledger can be edited, rolled back or fabricated by anyone with sufficient access. Filesystem checks and hashes are not atomic against an adversary with equivalent permissions. Limit access using your operating system, use separate isolation where required, and back up project state.

本项目面向可信的本机操作员和项目；不是沙箱、身份认证、防篡改审计日志、分布式锁，也不能证明审查或测试实际发生。有足够权限的人可以修改、回滚或伪造未签名账本；文件检查和哈希不能对抗同权限恶意并发。请使用操作系统权限、必要的独立隔离和备份。

The sidebar loads the entire ledger into memory. Its masking of common secret patterns is best effort, not guaranteed. Do not record secrets, sensitive logs or unnecessary personal data; inspect state, evidence, handoffs and screenshots before sharing. Selecting a project grants folder access through Desktop; disconnecting the view does not revoke that grant. Revoke persistent access through Capabilities → Plugins → Folder access. Refresh is needed to detect external revocation.

侧栏会把完整账本加载到内存；常见秘密模式的遮盖仅为尽力而为，不保证脱敏。不要记录秘密、敏感日志或不必要的个人信息；分享状态、证据、交接和截图之前人工检查。选择项目会通过 Desktop 授权文件夹，断开视图不会撤权；请到 Capabilities → Plugins → Folder access 撤销持久授权。外部撤权需要刷新后才能检测。

## Reporting / 报告问题

Do not publish exploit details or real secrets in a public issue. If the repository hosting service provides a private vulnerability-reporting feature, use it to contact the maintainers; otherwise request a private contact channel without posting sensitive details. Include the affected revision, environment, minimal reproduction using synthetic data, impact and any mitigation. Do not assume a response SLA or supported-version policy until the maintainers publish one.

不要在公开 issue 中发布利用细节或真实密钥。如果仓库托管平台提供私密漏洞报告功能，请用它联系维护者；否则先请求私密联系方式，不要发布敏感细节。请提供受影响的版本、环境、使用合成数据的最小复现、影响和已有缓解措施。维护者正式公布前，不应假定响应时限或支持版本策略。
