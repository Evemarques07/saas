# Focus NFe API - Documentação Completa

> Documentação para integração de SaaS com emissão de NFCe via API de Revenda

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Modelo de Faturamento (Revenda)](#modelo-de-faturamento-revenda)
3. [Autenticação](#autenticação)
4. [Ambientes](#ambientes)
5. [API de Revenda - Empresas](#api-de-revenda---empresas)
6. [API de Emissão - NFCe](#api-de-emissão---nfce)
7. [API de Emissão - NFe](#api-de-emissão---nfe)
8. [Certificado Digital](#certificado-digital)
9. [Webhooks e Callbacks](#webhooks-e-callbacks)
10. [Códigos de Erro](#códigos-de-erro)
11. [Planos e Preços](#planos-e-preços)
12. [Fluxo de Integração SaaS](#fluxo-de-integração-saas)

---

## Visão Geral

A Focus NFe é uma API REST para emissão de documentos fiscais eletrônicos no Brasil. Suporta:

| Documento | Descrição | Processamento |
|-----------|-----------|---------------|
| **NFe** | Nota Fiscal Eletrônica (B2B) | Assíncrono |
| **NFCe** | Nota Fiscal ao Consumidor | Síncrono |
| **NFSe** | Nota Fiscal de Serviço | Assíncrono |
| **CTe** | Conhecimento de Transporte | Assíncrono |
| **MDFe** | Manifesto de Documentos Fiscais | Assíncrono |

### Características

- API RESTful com JSON
- Autenticação via HTTP Basic Auth
- Gerencia comunicação com SEFAZ automaticamente
- Assinatura digital feita pelo servidor (não precisa assinar localmente)
- Suporte a múltiplos CNPJs

---

## Modelo de Faturamento (Revenda)

> **IMPORTANTE**: Esta seção explica como funciona a cobrança no modelo de revenda/parceiro

### Resumo Executivo

| Pergunta | Resposta |
|----------|----------|
| **Quem paga a Focus NFe?** | VOCÊ (parceiro/revenda) |
| **Clientes pagam a Focus?** | NÃO - pagam apenas você |
| **Fatura é centralizada?** | SIM - uma fatura única para você |
| **Focus contata seus clientes?** | NÃO - sem consentimento |

### Como Funciona

No modelo de revenda, a **fatura é 100% sua (Super Admin)**. A Focus NFe emite uma única fatura mensal para você, consolidando o uso de todas as empresas clientes cadastradas sob seu token de revenda.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FOCUS NFE                                │
│                                                                  │
│   Emite 1 FATURA ÚNICA ─────────────────▶  VOCÊ (Revenda)       │
│   (soma de todas as notas emitidas)              │               │
│                                                  │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                                                   │ Você define
                                                   │ seus preços
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │      SEUS CLIENTES          │
                                    │                             │
                                    │   Empresa A ─ Plano Básico  │
                                    │   Empresa B ─ Plano Pro     │
                                    │   Empresa C ─ Plano Premium │
                                    │                             │
                                    │   (Pagam VOCÊ, não a Focus) │
                                    └─────────────────────────────┘
```

### Base Legal (Termos de Uso)

De acordo com os [Termos de Uso da Focus NFe](https://focusnfe.com.br/termos-de-uso/):

> *"O USUÁRIO [revenda] se compromete exclusivamente a realizar todos os pagamentos referentes às empresas usuárias finais, assumindo a responsabilidade integral e exclusiva por esses pagamentos."*

> *"As empresas associadas à revenda são clientes única e exclusivamente do USUÁRIO, não podendo o Focus NFe, sem o consentimento do usuário, entrar em contato direto com a usuária final do sistema."*

### Suas Responsabilidades

| Responsabilidade | Detalhes |
|------------------|----------|
| **Pagamento** | Pagar a fatura mensal da Focus (todas as empresas) |
| **Cobrança** | Criar sua própria lógica de cobrança para clientes |
| **Controle de uso** | Monitorar quantas notas cada cliente emitiu |
| **Suporte** | Ser o ponto de contato dos seus clientes |
| **Transparência** | Informar clientes sobre os Termos de Uso |

### Vantagens do Modelo

1. **Autonomia comercial** - Defina seus próprios preços e planos
2. **Margem de lucro** - Diferença entre custo Focus e preço ao cliente
3. **Relacionamento** - Focus não compete com você pelos seus clientes
4. **Fatura única** - Simplifica gestão financeira
5. **Marca própria** - Seus clientes veem você como o provedor

### Modelo de Negócio Sugerido

#### Exemplo de Precificação

| Seu Plano | Notas/mês | Você cobra | Custo Focus* | Sua margem |
|-----------|-----------|------------|--------------|------------|
| Básico | 100 | R$ 49,90 | ~R$ 12,00 | R$ 37,90 |
| Profissional | 500 | R$ 149,90 | ~R$ 60,00 | R$ 89,90 |
| Empresarial | 1.000 | R$ 249,90 | ~R$ 120,00 | R$ 129,90 |
| Ilimitado | 3.000 | R$ 499,90 | ~R$ 360,00 | R$ 139,90 |

*Custo aproximado baseado no plano Growth (R$ 0,12/nota excedente)

#### Estrutura no seu SaaS

```
┌──────────────────────────────────────────────────────────────┐
│                    SEU SISTEMA DE BILLING                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Tabela de Planos                                         │
│     ├── plano_id                                             │
│     ├── nome (Básico, Pro, Enterprise)                       │
│     ├── limite_notas_mes                                     │
│     ├── preco_mensal                                         │
│     └── preco_nota_excedente                                 │
│                                                               │
│  2. Controle de Uso por Empresa                              │
│     ├── empresa_id                                           │
│     ├── plano_id                                             │
│     ├── notas_emitidas_mes                                   │
│     └── data_renovacao                                       │
│                                                               │
│  3. Faturamento                                              │
│     ├── Gerar fatura mensal por empresa                      │
│     ├── Calcular excedentes                                  │
│     └── Integrar com gateway de pagamento                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Central de Faturas Focus

Você pode gerenciar suas faturas no painel:

- **URL**: https://app-v2.focusnfe.com.br
- **Menu**: Serviços → Minha Conta
- **Funcionalidades**:
  - Visualizar faturas mês a mês
  - Ver valores e vencimentos
  - Imprimir segunda via de boleto
  - Reemitir boleto vencido
  - Contestar valores
  - Acessar NF emitida pela Focus

### Inadimplência

| Situação | Consequência |
|----------|--------------|
| Atraso > 10 dias | Acesso ao sistema pode ser bloqueado |
| Durante bloqueio | Cobrança continua (custos de guarda de documentos) |

### Perguntas Frequentes

**P: Posso repassar a fatura da Focus direto pro cliente?**
R: Não. A Focus não emite faturas individuais por empresa. Você precisa criar seu próprio sistema de cobrança.

**P: A Focus vai tentar vender direto pro meu cliente?**
R: Não. Conforme os Termos de Uso, a Focus não pode contatar seus clientes sem seu consentimento.

**P: Se um cliente não me pagar, posso deixar de pagar a Focus?**
R: Não. Você assume responsabilidade integral pelos pagamentos. Gerencie a inadimplência dos seus clientes no seu sistema.

**P: Posso ver quanto cada empresa gastou?**
R: Sim. Via API você pode consultar o uso de cada empresa e controlar internamente.

---

## Autenticação

### Tipos de Token

| Token | Finalidade | Ambiente |
|-------|------------|----------|
| **Token de Revenda** | Gerenciar empresas clientes (CRUD) | Produção apenas |
| **Token de Emissão (Homologação)** | Testes de emissão | Homologação |
| **Token de Emissão (Produção)** | Emissão real de documentos | Produção |

### Como Autenticar

Usar HTTP Basic Auth com o token como usuário e senha em branco:

```bash
# Exemplo com cURL
curl -u "SEU_TOKEN:" https://api.focusnfe.com.br/v2/empresas
```

```javascript
// Exemplo com JavaScript/Node.js
const token = "SEU_TOKEN";
const auth = Buffer.from(`${token}:`).toString('base64');

fetch('https://api.focusnfe.com.br/v2/empresas', {
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }
});
```

```php
// Exemplo com PHP
$token = "SEU_TOKEN";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.focusnfe.com.br/v2/empresas");
curl_setopt($ch, CURLOPT_USERPWD, "$token:");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
```

```csharp
// Exemplo com C#
var token = "SEU_TOKEN";
var client = new HttpClient();
var byteArray = Encoding.ASCII.GetBytes($"{token}:");
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));
```

---

## Ambientes

| Ambiente | URL Base | Uso |
|----------|----------|-----|
| **Homologação** | `https://homologacao.focusnfe.com.br` | Testes (notas sem valor fiscal) |
| **Produção** | `https://api.focusnfe.com.br` | Emissão real |

---

## API de Revenda - Empresas

> Usar **Token de Revenda** para estes endpoints

### Criar Empresa

```
POST /v2/empresas
```

**Query Parameters:**
- `dry_run=1` - Simula criação sem persistir (para testes)

**Campos Obrigatórios:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome` | string | Razão social |
| `cnpj` | string | CNPJ (apenas números) |
| `logradouro` | string | Endereço |
| `numero` | integer | Número do endereço |
| `bairro` | string | Bairro |
| `municipio` | string | Nome da cidade |
| `cep` | integer | CEP (apenas números) |
| `uf` | string | Sigla do estado (2 letras) |
| `regime_tributario` | integer | 1=Simples Nacional, 2=Simples Excesso, 3=Lucro Presumido/Real |

**Campos Opcionais:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome_fantasia` | string | Nome fantasia |
| `email` | string | E-mail de contato |
| `telefone` | string | Telefone |
| `inscricao_estadual` | string | Inscrição estadual |
| `inscricao_municipal` | string | Inscrição municipal |
| `complemento` | string | Complemento do endereço |
| `cpf` | string | CPF (para pessoa física) |
| `cpf_responsavel` | string | CPF do responsável |
| `codigo_municipio` | string | Código IBGE do município |
| `codigo_pais` | string | Código do país (1058 = Brasil) |
| `pais` | string | Nome do país |

**Campos para Certificado Digital:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `arquivo_certificado_base64` | string | Arquivo .pfx/.p12 em base64 |
| `senha_certificado` | string | Senha do certificado |

**Campos para Habilitar Documentos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `habilita_nfe` | boolean | Habilita emissão de NFe |
| `habilita_nfce` | boolean | Habilita emissão de NFCe |
| `habilita_nfse` | boolean | Habilita emissão de NFSe |
| `habilita_cte` | boolean | Habilita emissão de CTe |
| `habilita_mdfe` | boolean | Habilita emissão de MDFe |

**Campos Específicos NFCe:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `csc_nfce_producao` | string | Código de Segurança do Contribuinte (produção) |
| `id_token_nfce_producao` | string | ID do token CSC (produção) |
| `csc_nfce_homologacao` | string | CSC para homologação |
| `id_token_nfce_homologacao` | string | ID do token CSC (homologação) |

**Campos de Séries:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `serie_nfe` | integer | Série padrão para NFe |
| `proximo_numero_nfe` | integer | Próximo número de NFe |
| `serie_nfce` | integer | Série padrão para NFCe |
| `proximo_numero_nfce` | integer | Próximo número de NFCe |

**Exemplo de Requisição Completa:**

```json
{
  "nome": "Empresa Exemplo Ltda",
  "nome_fantasia": "Exemplo Store",
  "cnpj": "12345678000199",
  "inscricao_estadual": "123456789",
  "inscricao_municipal": "12345",
  "regime_tributario": 1,
  "email": "contato@exemplo.com.br",
  "telefone": "11999999999",
  "logradouro": "Rua das Flores",
  "numero": 100,
  "complemento": "Sala 10",
  "bairro": "Centro",
  "municipio": "São Paulo",
  "codigo_municipio": "3550308",
  "cep": 01310100,
  "uf": "SP",
  "habilita_nfe": true,
  "habilita_nfce": true,
  "serie_nfe": 1,
  "proximo_numero_nfe": 1,
  "serie_nfce": 1,
  "proximo_numero_nfce": 1,
  "csc_nfce_producao": "A1B2C3D4E5F6G7H8",
  "id_token_nfce_producao": "000001",
  "arquivo_certificado_base64": "MIIKYQIBAzCCCicGCSqGSIb3DQEHAaCCChgE...",
  "senha_certificado": "senha123"
}
```

**Resposta de Sucesso (200):**

```json
{
  "id": 12345,
  "nome": "Empresa Exemplo Ltda",
  "nome_fantasia": "Exemplo Store",
  "cnpj": "12345678000199",
  "token_producao": "TOKEN_EMISSAO_PRODUCAO_AQUI",
  "token_homologacao": "TOKEN_EMISSAO_HOMOLOGACAO_AQUI",
  "certificado_validade": "2025-12-31",
  "habilita_nfe": true,
  "habilita_nfce": true,
  ...
}
```

---

### Consultar Empresa

```
GET /v2/empresas/{cnpj}
```

**Exemplo:**
```bash
curl -u "TOKEN_REVENDA:" https://api.focusnfe.com.br/v2/empresas/12345678000199
```

---

### Listar Empresas

```
GET /v2/empresas
```

**Query Parameters:**
- `pagina` - Número da página (padrão: 1)
- `por_pagina` - Itens por página (padrão: 50)

**Exemplo:**
```bash
curl -u "TOKEN_REVENDA:" "https://api.focusnfe.com.br/v2/empresas?pagina=1&por_pagina=20"
```

---

### Alterar Empresa

```
PUT /v2/empresas/{cnpj}
```

**Exemplo - Atualizar Certificado:**
```json
{
  "arquivo_certificado_base64": "MIIKYQIBAzCCCicGCSqGSIb3...",
  "senha_certificado": "nova_senha"
}
```

**Exemplo - Atualizar CSC NFCe:**
```json
{
  "csc_nfce_producao": "NOVO_CSC_AQUI",
  "id_token_nfce_producao": "000002"
}
```

---

### Excluir Empresa

```
DELETE /v2/empresas/{cnpj}
```

**Exemplo:**
```bash
curl -X DELETE -u "TOKEN_REVENDA:" https://api.focusnfe.com.br/v2/empresas/12345678000199
```

---

## API de Emissão - NFCe

> Usar **Token de Emissão** da empresa para estes endpoints
> NFCe usa processamento **síncrono** (resposta imediata)

### Emitir NFCe

```
POST /v2/nfce?ref={referencia_unica}
```

**Parâmetros:**
- `ref` - Identificador único da nota (alfanumérico, sem caracteres especiais)

**Campos Obrigatórios:**

```json
{
  "natureza_operacao": "VENDA AO CONSUMIDOR",
  "forma_pagamento": "0",
  "tipo_documento": "1",
  "finalidade_emissao": "1",
  "consumidor_final": "1",
  "presenca_comprador": "1",
  "items": [
    {
      "numero_item": 1,
      "codigo_produto": "001",
      "descricao": "Produto Exemplo",
      "cfop": "5102",
      "unidade_comercial": "UN",
      "quantidade_comercial": 1,
      "valor_unitario_comercial": 100.00,
      "valor_bruto": 100.00,
      "unidade_tributavel": "UN",
      "quantidade_tributavel": 1,
      "valor_unitario_tributavel": 100.00,
      "origem": "0",
      "ncm": "94036000",
      "icms_situacao_tributaria": "102",
      "pis_situacao_tributaria": "07",
      "cofins_situacao_tributaria": "07"
    }
  ],
  "formas_pagamento": [
    {
      "forma_pagamento": "01",
      "valor_pagamento": 100.00
    }
  ]
}
```

**Campos do Item:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `numero_item` | integer | Sim | Sequencial do item |
| `codigo_produto` | string | Sim | Código interno do produto |
| `descricao` | string | Sim | Descrição do produto |
| `cfop` | string | Sim | CFOP da operação |
| `unidade_comercial` | string | Sim | Unidade (UN, KG, etc) |
| `quantidade_comercial` | decimal | Sim | Quantidade |
| `valor_unitario_comercial` | decimal | Sim | Valor unitário |
| `valor_bruto` | decimal | Sim | Valor total do item |
| `ncm` | string | Sim | Código NCM (8 dígitos) |
| `origem` | string | Sim | Origem da mercadoria (0-8) |
| `icms_situacao_tributaria` | string | Sim | CST/CSOSN do ICMS |
| `pis_situacao_tributaria` | string | Sim | CST do PIS |
| `cofins_situacao_tributaria` | string | Sim | CST do COFINS |

**Formas de Pagamento:**

| Código | Descrição |
|--------|-----------|
| `01` | Dinheiro |
| `02` | Cheque |
| `03` | Cartão de Crédito |
| `04` | Cartão de Débito |
| `05` | Crédito Loja |
| `10` | Vale Alimentação |
| `11` | Vale Refeição |
| `12` | Vale Presente |
| `13` | Vale Combustível |
| `15` | Boleto Bancário |
| `16` | Depósito Bancário |
| `17` | PIX |
| `18` | Transferência |
| `19` | Cashback |
| `90` | Sem Pagamento |
| `99` | Outros |

**Resposta de Sucesso:**

```json
{
  "status": "autorizado",
  "status_sefaz": "100",
  "mensagem_sefaz": "Autorizado o uso da NF-e",
  "chave_nfe": "35210612345678000199650010000000011234567890",
  "numero": "1",
  "serie": "1",
  "caminho_xml_nota_fiscal": "/arquivos/35210612345678000199650010000000011234567890.xml",
  "caminho_danfe": "/arquivos/35210612345678000199650010000000011234567890.pdf",
  "qrcode_url": "https://www.nfce.fazenda.sp.gov.br/..."
}
```

---

### Consultar NFCe

```
GET /v2/nfce/{referencia}
```

---

### Cancelar NFCe

```
DELETE /v2/nfce/{referencia}
```

**Body:**
```json
{
  "justificativa": "Erro na emissão da nota fiscal"
}
```

> Mínimo 15 caracteres na justificativa
> Prazo: até 24 horas após emissão (varia por estado)

---

### Reenviar E-mail NFCe

```
POST /v2/nfce/{referencia}/email
```

**Body:**
```json
{
  "emails": ["cliente@email.com", "outro@email.com"]
}
```

---

## API de Emissão - NFe

> Processamento **assíncrono** - requer consulta posterior

### Emitir NFe

```
POST /v2/nfe?ref={referencia_unica}
```

**Campos Obrigatórios:**

```json
{
  "natureza_operacao": "VENDA DE MERCADORIA",
  "forma_pagamento": "0",
  "tipo_documento": "1",
  "finalidade_emissao": "1",
  "consumidor_final": "0",
  "presenca_comprador": "9",
  "cnpj_destinatario": "98765432000188",
  "nome_destinatario": "Cliente Empresa Ltda",
  "inscricao_estadual_destinatario": "987654321",
  "logradouro_destinatario": "Av. Brasil",
  "numero_destinatario": "1000",
  "bairro_destinatario": "Industrial",
  "municipio_destinatario": "São Paulo",
  "uf_destinatario": "SP",
  "cep_destinatario": "01310000",
  "indicador_ie_destinatario": "1",
  "items": [
    {
      "numero_item": 1,
      "codigo_produto": "001",
      "descricao": "Produto Industrial",
      "cfop": "5102",
      "unidade_comercial": "UN",
      "quantidade_comercial": 10,
      "valor_unitario_comercial": 150.00,
      "valor_bruto": 1500.00,
      "unidade_tributavel": "UN",
      "quantidade_tributavel": 10,
      "valor_unitario_tributavel": 150.00,
      "origem": "0",
      "ncm": "84713012",
      "icms_situacao_tributaria": "102",
      "icms_base_calculo": 1500.00,
      "icms_aliquota": 18,
      "icms_valor": 270.00,
      "pis_situacao_tributaria": "01",
      "pis_base_calculo": 1500.00,
      "pis_aliquota_porcentual": 1.65,
      "pis_valor": 24.75,
      "cofins_situacao_tributaria": "01",
      "cofins_base_calculo": 1500.00,
      "cofins_aliquota_porcentual": 7.60,
      "cofins_valor": 114.00
    }
  ],
  "formas_pagamento": [
    {
      "forma_pagamento": "15",
      "valor_pagamento": 1500.00
    }
  ]
}
```

---

### Consultar NFe

```
GET /v2/nfe/{referencia}
```

**Status Possíveis:**

| Status | Descrição |
|--------|-----------|
| `processando_autorizacao` | Aguardando SEFAZ |
| `autorizado` | Nota autorizada |
| `cancelado` | Nota cancelada |
| `erro_autorizacao` | Erro na autorização |

---

### Cancelar NFe

```
DELETE /v2/nfe/{referencia}
```

**Body:**
```json
{
  "justificativa": "Cancelamento por erro de digitação nos dados do cliente"
}
```

---

### Carta de Correção (CCe)

```
POST /v2/nfe/{referencia}/carta_correcao
```

**Body:**
```json
{
  "correcao": "Onde se lê PRODUTO X, leia-se PRODUTO Y"
}
```

> Mínimo 15 caracteres
> Não pode corrigir valores, impostos ou dados do destinatário

---

### Inutilização de Numeração

```
POST /v2/nfe/inutilizacao
```

**Body:**
```json
{
  "cnpj": "12345678000199",
  "serie": "1",
  "numero_inicial": "10",
  "numero_final": "15",
  "justificativa": "Falha no sistema durante emissão das notas"
}
```

---

## Certificado Digital

### Requisitos

- **Tipo**: Apenas certificado modelo **A1** (.pfx ou .p12)
- **Modelo A3 NÃO é suportado** (requer hardware físico)
- **Validade**: Certificado deve estar dentro da validade

### Enviar Certificado via API

```
PUT /v2/empresas/{cnpj}
```

```json
{
  "arquivo_certificado_base64": "MIIKYQIBAzCCCicGCSqGSIb3DQEH...",
  "senha_certificado": "senha_do_certificado"
}
```

### Converter PFX para Base64

**Node.js:**
```javascript
const fs = require('fs');
const certificado = fs.readFileSync('certificado.pfx');
const base64 = certificado.toString('base64');
```

**C#:**
```csharp
byte[] bytes = File.ReadAllBytes("certificado.pfx");
string base64 = Convert.ToBase64String(bytes);
```

**PHP:**
```php
$certificado = file_get_contents('certificado.pfx');
$base64 = base64_encode($certificado);
```

**Python:**
```python
import base64
with open('certificado.pfx', 'rb') as f:
    base64_cert = base64.b64encode(f.read()).decode('utf-8')
```

---

## Webhooks e Callbacks

### Configurar Webhook

```
PUT /v2/empresas/{cnpj}
```

```json
{
  "webhook_url": "https://seusite.com.br/webhook/focusnfe"
}
```

### Payload do Webhook

```json
{
  "cnpj": "12345678000199",
  "ref": "pedido_12345",
  "status": "autorizado",
  "chave_nfe": "35210612345678000199550010000000011234567890"
}
```

---

## Códigos de Erro

### HTTP Status Codes

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `400` | Requisição inválida |
| `403` | Não autorizado |
| `404` | Recurso não encontrado |
| `422` | Erro de validação |
| `429` | Rate limit excedido |
| `500` | Erro interno |

### Erros Comuns

| Código | Mensagem | Solução |
|--------|----------|---------|
| `empresa_nao_habilitada` | Empresa não habilitada | Verificar certificado e habilitações |
| `nfe_cancelada` | NFe já cancelada | - |
| `cnpj_emitente_invalido` | CNPJ do emitente inválido | Verificar cadastro da empresa |
| `certificado_invalido` | Certificado inválido | Enviar certificado A1 válido |
| `csc_invalido` | CSC inválido para NFCe | Configurar CSC no cadastro |

---

## Planos e Preços

### Planos Padrão

| Plano | Preço/mês | CNPJs | Notas Incluídas | Excedente |
|-------|-----------|-------|-----------------|-----------|
| **Solo** | R$ 89,90 | 1 | 100 | R$ 0,10 |
| **Start** | R$ 113,90 | 3 | 100/CNPJ | R$ 0,10 |
| **Growth** | R$ 548,00 | Ilimitados | 4.000 | R$ 0,12 |
| **Enterprise** | Sob consulta | Ilimitados | 50k+ | Negociável |

### Planos Varejo (NFCe)

| Plano | Preço/mês | CNPJs | NFCe | NFe |
|-------|-----------|-------|------|-----|
| **Retail** | R$ 59,90 | 1 | 500 | 100 |
| **Retail+** | R$ 629,90 | Ilimitados | 9.000 | 1.000 |

### Para SaaS com Múltiplos Clientes

**Recomendado:** Plano **Growth** ou **Retail+** para começar, migrar para **Enterprise** conforme crescimento.

---

## Fluxo de Integração SaaS

### Arquitetura Recomendada

```
┌─────────────────────────────────────────────────────────────────┐
│                         SEU SAAS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │───▶│   Backend    │───▶│   Database   │      │
│  │   (React)    │    │   (API)      │    │  (Empresas)  │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             │ Token Revenda                      │
│                             ▼                                    │
│                    ┌──────────────────┐                         │
│                    │  Focus NFe API   │                         │
│                    │                  │                         │
│                    │ • Criar Empresa  │                         │
│                    │ • Emitir NFCe    │                         │
│                    │ • Consultar      │                         │
│                    │ • Cancelar       │                         │
│                    └──────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Cadastro de Cliente

```
1. Cliente se cadastra no seu SaaS
   └── Coleta: CNPJ, dados empresa, certificado A1, CSC

2. Backend valida documentação
   └── Verifica CNPJ, validade certificado

3. POST /v2/empresas (com token de revenda)
   └── Cria empresa na Focus NFe
   └── Recebe tokens de emissão

4. Armazena tokens no seu banco
   └── Associa token_producao ao cliente
   └── Associa token_homologacao ao cliente

5. Cliente pode emitir NFCe
   └── POST /v2/nfce (com token do cliente)
```

### Fluxo de Emissão de NFCe

```
1. Cliente faz venda no PDV/Sistema

2. Seu backend monta JSON da NFCe

3. POST /v2/nfce?ref=venda_123
   └── Usa token de emissão do cliente
   └── Resposta síncrona

4. Recebe resposta
   ├── Sucesso: salva chave, gera DANFE
   └── Erro: trata e notifica cliente

5. Disponibiliza DANFE para impressão
```

### Boas Práticas

1. **Armazene tokens de forma segura** (criptografados)
2. **Use referências únicas** (UUID ou prefixo+sequencial)
3. **Implemente retry** para falhas de rede
4. **Monitore validade** dos certificados
5. **Teste em homologação** antes de produção
6. **Configure webhooks** para processamento assíncrono

---

## Contatos e Suporte

| Canal | Contato |
|-------|---------|
| **Suporte Técnico** | suporte@focusnfe.com.br |
| **Documentação** | https://focusnfe.com.br/doc/ |
| **Fórum** | https://forum.focusnfe.com.br |
| **Painel API** | https://app-v2.focusnfe.com.br |
| **Cadastro** | https://focusnfe.com.br/cadastro |

---

## Links Úteis

- [Documentação Oficial](https://focusnfe.com.br/doc/)
- [Guia de Passos Iniciais](https://focusnfe.com.br/guides/passos-iniciais/)
- [Referência API - Criar Empresa](https://doc.focusnfe.com.br/reference/criarempresa)
- [Postman Collection](https://www.postman.com/focusnfe/focus-nfe/documentation/906jrtc/focus-nfe)
- [Planos e Preços](https://focusnfe.com.br/precos/)

---

*Documento gerado em: Janeiro/2026*
*Fonte: Documentação oficial Focus NFe*
