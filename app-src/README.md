# SIFAU — Sistema Municipal de Fiscalização e Atendimento Urbano

Plataforma institucional que conecta **4 perfis** em um único app: **Cidadão**, **Fiscal**,
**Gestor Municipal** e **Auditor/Admin** — com autenticação por papel, vistoria em campo
**offline-first**, classificação por **IA generativa** (com fallback heurístico), ordens de
serviço formais com **geofencing** e **trilha de auditoria imutável** (hash SHA-256).

## Fluxo do sistema

1. **Cidadão** registra ocorrência (fotos comprimidas no cliente + GPS).
2. **IA** classifica categoria/urgência/duplicidade (fallback heurístico se offline/sem chave).
3. **Atribuição automática** ao fiscal com a fila mais curta (evita cherry-picking).
4. **Fiscal** vistoria em campo (offline-first), registra chegada com GPS, laudo, ação e fotos.
5. **Gestão** acompanha KPIs, redistribui escalonados, emite OS com geofencing; o fiscal pode
   lavrar **auto de infração** com ciência do autuado e gerar **PDF** do relatório.
6. **Auditor** vê a trilha imutável (IP/geo/timestamp), gerencia usuários e exporta relatórios
   com **hash SHA-256** registrado (cadeia de custódia).
