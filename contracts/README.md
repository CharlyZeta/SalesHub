# Contratos SDD-GL — SalesHub

Carpeta de especificaciones ejecutables bajo el protocolo **Spec-Driven Development with Gate/Loop (SDD-GL v0.3.0)**.

Todo nuevo desarrollo o fix se formaliza en un contrato (`contracts/FIX-XXXX.md` o `contracts/FEAT-XXXX.md`) con las secciones:
- **Header**: ID, Status (`DRAFT` | `APPROVED` | `RESOLVED`), Mode (`GATE` | `LOOP`), Gate-Mode (`EXPRESS` | `STRICT`)
- **Intent**: Objetivo y síntoma a resolver
- **Use Case**: Actor, Goal, Main Flow, Alternative Flows (AF-XX)
- **Business Rules**: Invariantes verificables (BR-XXX)
- **Acceptance Criteria**: Criterios GIVEN/WHEN/THEN (AC-XXX)
- **Entities Affected**: Entidades impactadas
- **Ambiguity Log**: Puntos de duda resueltos antes del loop
- **Completion Map**: Lista atómica de tareas y su estado (`❌` | `⏳` | `✅`)

## Regla del HO-Gate
El humano es el único que puede autorizar el paso a ejecución autónoma:
`Status: DRAFT → APPROVED` + `Mode: GATE → LOOP`.
