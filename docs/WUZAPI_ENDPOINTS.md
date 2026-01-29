# WuzAPI - Documentacao dos Endpoints

Documentacao completa da API WuzAPI rodando no servidor `evertonapi`.

## Informacoes do Servidor

| Campo | Valor |
|-------|-------|
| **Host** | evertonapi (SSH) |
| **Porta** | 8080 |
| **Container** | wuzapi (Docker) |
| **Imagem** | asternic/wuzapi:latest |
| **Timezone** | America/Sao_Paulo |

## Autenticacao

A API utiliza dois tipos de autenticacao:

### 1. Admin Token
- **Header:** `Authorization: {ADMIN_TOKEN}`
- **Uso:** Endpoints administrativos (`/admin/*`)
- **Permissao:** Gerenciar usuarios/sessoes

### 2. User Token
- **Header:** `Token: {USER_TOKEN}`
- **Uso:** Todos os outros endpoints
- **Permissao:** Operacoes da sessao do usuario

## Sessoes Configuradas

| Nome | Token | Status | JID |
|------|-------|--------|-----|
| ejym-frutos-da-terra | `frutos-da-terra_token_mlx4pr` | Conectado | 558598565551@s.whatsapp.net |
| ejym-newempire | `newempire_token_mkj4uhmv` | Desconectado | - |
| ejym-storefashion | `storefashion_token_imfksa` | Desconectado | - |

---

## Endpoints Administrativos

### Listar Usuarios

```http
GET /admin/users
Authorization: {ADMIN_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": [
    {
      "id": "f8008697d3bc9f9b09ab9718d09e9546",
      "name": "ejym-frutos-da-terra",
      "token": "frutos-da-terra_token_mlx4pr",
      "jid": "558598565551:62@s.whatsapp.net",
      "connected": true,
      "loggedIn": true,
      "webhook": "",
      "events": "",
      "proxy_config": { "enabled": false, "proxy_url": "" },
      "s3_config": { "enabled": false, ... }
    }
  ],
  "success": true
}
```

### Criar Usuario

```http
POST /admin/users
Authorization: {ADMIN_TOKEN}
Content-Type: application/json

{
  "name": "nome-da-sessao",
  "token": "token_unico_seguro",
  "webhook": "https://seu-webhook.com/callback",
  "events": "Message,ReadReceipt,HistorySync"
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": { "id": "abc123..." },
  "success": true
}
```

### Deletar Usuario

```http
DELETE /admin/users/{id}
Authorization: {ADMIN_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": { "Details": "User deleted successfully" },
  "success": true
}
```

---

## Endpoints de Sessao

### Conectar Sessao

Inicia a conexao com o WhatsApp. Se nao estiver logado, gera QR Code.

```http
POST /session/connect
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Subscribe": ["Message", "ReadReceipt", "Presence"],
  "Immediate": true
}
```

**Eventos disponiveis para Subscribe:**
- `Message` - Mensagens recebidas
- `ReadReceipt` - Confirmacoes de leitura
- `Presence` - Status online/offline
- `HistorySync` - Sincronizacao de historico
- `ChatPresence` - Digitando/gravando
- `Call` - Chamadas
- `Group` - Eventos de grupo

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "details": "Connected successfully",
    "events": "Message,ReadReceipt",
    "jid": "5585XXXXXXXX@s.whatsapp.net",
    "webhook": ""
  },
  "success": true
}
```

### Desconectar Sessao

Desconecta mas mantem a sessao logada (pode reconectar sem QR).

```http
POST /session/disconnect
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": { "Details": "Disconnected" },
  "success": true
}
```

### Logout

Desconecta e remove a sessao (precisara escanear QR novamente).

```http
POST /session/logout
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": { "Details": "Logged out successfully" },
  "success": true
}
```

### Status da Sessao

```http
GET /session/status
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "connected": true,
    "loggedIn": true,
    "id": "f8008697d3bc9f9b09ab9718d09e9546",
    "jid": "558598565551:62@s.whatsapp.net",
    "name": "ejym-frutos-da-terra",
    "webhook": "",
    "events": "",
    "qrcode": ""
  },
  "success": true
}
```

### Obter QR Code

Retorna o QR Code para escanear (quando nao logado).

```http
GET /session/qr
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "QRCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU..."
  },
  "success": true
}
```

---

## Endpoints de Webhook

### Configurar Webhook

```http
POST /webhook
Token: {USER_TOKEN}
Content-Type: application/json

{
  "webhookURL": "https://seu-servidor.com/webhook/whatsapp"
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": { "webhook": "https://seu-servidor.com/webhook/whatsapp" },
  "success": true
}
```

### Obter Webhook

```http
GET /webhook
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "subscribe": ["Message", "ReadReceipt"],
    "webhook": "https://seu-servidor.com/webhook/whatsapp"
  },
  "success": true
}
```

---

## Endpoints de Usuario/Contato

### Verificar Numeros no WhatsApp

Verifica se os numeros estao registrados no WhatsApp.

```http
POST /user/check
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": ["5585999999999", "5585888888888"]
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": [
    {
      "Query": "5585999999999",
      "IsInWhatsapp": true,
      "JID": "5585999999999@s.whatsapp.net",
      "VerifiedName": "Nome Verificado"
    },
    {
      "Query": "5585888888888",
      "IsInWhatsapp": false,
      "JID": "",
      "VerifiedName": ""
    }
  ],
  "success": true
}
```

### Obter Informacoes do Usuario

```http
POST /user/info
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": ["5585999999999"]
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": [
    {
      "JID": "5585999999999@s.whatsapp.net",
      "VerifiedName": "Nome da Empresa",
      "Status": "Disponivel",
      "PictureID": "1234567890",
      "Devices": []
    }
  ],
  "success": true
}
```

### Obter Avatar

```http
GET /user/avatar?Phone=5585999999999&Preview=true
Token: {USER_TOKEN}
```

**Parametros:**
- `Phone` - Numero do telefone
- `Preview` - `true` para imagem menor, `false` para full

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "URL": "https://pps.whatsapp.net/...",
    "ID": "1234567890",
    "Type": "image",
    "DirectPath": "/v/..."
  },
  "success": true
}
```

### Listar Contatos

```http
GET /user/contacts
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "5585999999999@s.whatsapp.net": {
      "Found": true,
      "FirstName": "Joao",
      "FullName": "Joao Silva",
      "PushName": "Joao",
      "BusinessName": ""
    }
  },
  "success": true
}
```

---

## Endpoints de Chat - Envio de Mensagens

### Enviar Mensagem de Texto

```http
POST /chat/send/text
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Body": "Ola! Esta e uma mensagem de teste.",
  "Id": "msg_id_opcional",
  "LinkPreview": true
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "Details": "Message sent",
    "Id": "3EB0A1B2C3D4E5F6",
    "Timestamp": "2026-01-26T10:30:00Z"
  },
  "success": true
}
```

### Enviar Imagem

```http
POST /chat/send/image
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "Caption": "Legenda da imagem (opcional)"
}
```

### Enviar Audio

```http
POST /chat/send/audio
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Audio": "data:audio/ogg;base64,T2dnUwAC..."
}
```

### Enviar Documento

```http
POST /chat/send/document
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Document": "data:application/pdf;base64,JVBERi0xLjQ...",
  "FileName": "documento.pdf"
}
```

### Enviar Video

```http
POST /chat/send/video
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Video": "data:video/mp4;base64,AAAAIGZ0eXBpc...",
  "Caption": "Legenda do video (opcional)",
  "JpegThumbnail": "data:image/jpeg;base64,..."
}
```

### Enviar Sticker

```http
POST /chat/send/sticker
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Sticker": "data:image/webp;base64,UklGRh4A...",
  "PackId": "com.empresa.stickers",
  "PackName": "Meus Stickers",
  "Emojis": ["😀", "🎉"]
}
```

### Enviar Localizacao

```http
POST /chat/send/location
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Latitude": -3.7319,
  "Longitude": -38.5267,
  "Name": "Fortaleza, CE"
}
```

### Enviar Contato (vCard)

```http
POST /chat/send/contact
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Name": "Joao Silva",
  "Vcard": "BEGIN:VCARD\nVERSION:3.0\nFN:Joao Silva\nTEL:+5585999999999\nEND:VCARD"
}
```

### Enviar Mensagem Template (Botoes)

```http
POST /chat/send/template
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Content": "Escolha uma opcao:",
  "Footer": "Responda com o numero da opcao",
  "Buttons": [
    { "Id": "1", "DisplayText": "Opcao 1" },
    { "Id": "2", "DisplayText": "Opcao 2" },
    { "Id": "3", "DisplayText": "Opcao 3" }
  ]
}
```

---

## Endpoints de Chat - Interacoes

### Definir Presenca (Digitando)

```http
POST /chat/presence
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "State": "composing",
  "Media": "text"
}
```

**States disponiveis:**
- `composing` - Digitando...
- `paused` - Parou de digitar
- `recording` - Gravando audio...

**Media types:**
- `text` - Digitando texto
- `audio` - Gravando audio

### Marcar como Lido

```http
POST /chat/markread
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Id": ["3EB0A1B2C3D4E5F6", "3EB0A1B2C3D4E5F7"],
  "ChatPhone": "5585999999999",
  "SenderPhone": "5585888888888"
}
```

### Reagir a Mensagem

```http
POST /chat/react
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Phone": "5585999999999",
  "Id": "3EB0A1B2C3D4E5F6",
  "Body": "👍"
}
```

**Nota:** Para remover reacao, envie `Body` vazio.

---

## Endpoints de Chat - Download de Midia

### Download de Imagem

```http
POST /chat/downloadimage
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Url": "https://mmg.whatsapp.net/...",
  "MediaKey": "base64_key",
  "Mimetype": "image/jpeg",
  "FileSHA256": "sha256_hash",
  "FileLength": 123456,
  "FileEncSHA256": "enc_sha256_hash"
}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "Data": "base64_image_data",
    "Mimetype": "image/jpeg"
  },
  "success": true
}
```

### Download de Video

```http
POST /chat/downloadvideo
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Url": "https://mmg.whatsapp.net/...",
  "MediaKey": "base64_key",
  "Mimetype": "video/mp4",
  "FileSHA256": "sha256_hash",
  "FileLength": 123456,
  "FileEncSHA256": "enc_sha256_hash"
}
```

### Download de Audio

```http
POST /chat/downloadaudio
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Url": "https://mmg.whatsapp.net/...",
  "MediaKey": "base64_key",
  "Mimetype": "audio/ogg; codecs=opus",
  "FileSHA256": "sha256_hash",
  "FileLength": 123456,
  "FileEncSHA256": "enc_sha256_hash"
}
```

### Download de Documento

```http
POST /chat/downloaddocument
Token: {USER_TOKEN}
Content-Type: application/json

{
  "Url": "https://mmg.whatsapp.net/...",
  "MediaKey": "base64_key",
  "Mimetype": "application/pdf",
  "FileSHA256": "sha256_hash",
  "FileLength": 123456,
  "FileEncSHA256": "enc_sha256_hash"
}
```

---

## Endpoints de Grupos

### Listar Grupos

```http
GET /group/list
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "Groups": [
      {
        "JID": "120363390937554055@g.us",
        "Name": "Nome do Grupo",
        "Topic": "Descricao do grupo",
        "OwnerJID": "5585999999999@s.whatsapp.net",
        "IsAnnounce": false,
        "IsLocked": false,
        "Participants": [
          {
            "JID": "5585999999999@s.whatsapp.net",
            "IsAdmin": true,
            "IsSuperAdmin": true
          }
        ]
      }
    ]
  },
  "success": true
}
```

### Informacoes do Grupo

```http
GET /group/info?GroupJID=120363390937554055@g.us
Token: {USER_TOKEN}
```

### Obter Link de Convite

```http
GET /group/invitelink?GroupJID=120363390937554055@g.us
Token: {USER_TOKEN}
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "InviteLink": "https://chat.whatsapp.com/ABC123xyz"
  },
  "success": true
}
```

### Criar Grupo

```http
POST /group/create
Token: {USER_TOKEN}
Content-Type: application/json

{
  "name": "Nome do Novo Grupo",
  "participants": ["5585999999999", "5585888888888"]
}
```

### Alterar Nome do Grupo

```http
POST /group/name
Token: {USER_TOKEN}
Content-Type: application/json

{
  "GroupJID": "120363390937554055@g.us",
  "Name": "Novo Nome do Grupo"
}
```

### Alterar Foto do Grupo

```http
POST /group/photo
Token: {USER_TOKEN}
Content-Type: application/json

{
  "GroupJID": "120363390937554055@g.us",
  "Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Remover Foto do Grupo

```http
POST /group/photo/remove
Token: {USER_TOKEN}
Content-Type: application/json

{
  "groupjid": "120363390937554055@g.us"
}
```

### Bloquear Grupo (Somente Admins)

```http
POST /group/locked
Token: {USER_TOKEN}
Content-Type: application/json

{
  "groupjid": "120363390937554055@g.us",
  "locked": true
}
```

### Configurar Mensagens Temporarias

```http
POST /group/ephemeral
Token: {USER_TOKEN}
Content-Type: application/json

{
  "groupjid": "120363390937554055@g.us",
  "duration": "24h"
}
```

**Duracoes disponiveis:**
- `24h` - 24 horas
- `7d` - 7 dias
- `90d` - 90 dias
- `off` - Desativado

---

## Endpoints de HMAC

### Configurar HMAC Key

```http
POST /session/hmac/config
Token: {USER_TOKEN}
Content-Type: application/json

{
  "hmac_key": "sua_chave_hmac_com_minimo_32_caracteres"
}
```

### Obter Status HMAC

```http
GET /session/hmac/config
Token: {USER_TOKEN}
```

### Remover HMAC

```http
DELETE /session/hmac/config
Token: {USER_TOKEN}
```

---

## Endpoints de S3 Storage

### Configurar S3

```http
POST /session/s3/config
Token: {USER_TOKEN}
Content-Type: application/json

{
  "enabled": true,
  "endpoint": "s3.amazonaws.com",
  "region": "us-east-1",
  "bucket": "meu-bucket",
  "access_key": "AKIAXXXXXXXX",
  "secret_key": "secret_key_here",
  "path_style": false,
  "public_url": "https://meu-bucket.s3.amazonaws.com",
  "media_delivery": "url",
  "retention_days": 30
}
```

### Obter Configuracao S3

```http
GET /session/s3/config
Token: {USER_TOKEN}
```

### Testar Conexao S3

```http
POST /session/s3/test
Token: {USER_TOKEN}
```

### Remover Configuracao S3

```http
DELETE /session/s3/config
Token: {USER_TOKEN}
```

---

## Estrutura de Webhook (Eventos Recebidos)

Quando configurado, o webhook recebe eventos no formato:

### Mensagem Recebida

```json
{
  "event": "Message",
  "data": {
    "Info": {
      "ID": "3EB0A1B2C3D4E5F6",
      "MessageSource": {
        "Chat": "5585999999999@s.whatsapp.net",
        "Sender": "5585888888888@s.whatsapp.net",
        "IsFromMe": false,
        "IsGroup": false
      },
      "Timestamp": "2026-01-26T10:30:00Z",
      "Type": "text"
    },
    "Message": {
      "Conversation": "Conteudo da mensagem"
    }
  }
}
```

### Confirmacao de Leitura

```json
{
  "event": "ReadReceipt",
  "data": {
    "MessageIDs": ["3EB0A1B2C3D4E5F6"],
    "Chat": "5585999999999@s.whatsapp.net",
    "Timestamp": "2026-01-26T10:31:00Z"
  }
}
```

### Presenca

```json
{
  "event": "Presence",
  "data": {
    "JID": "5585999999999@s.whatsapp.net",
    "Unavailable": false,
    "LastSeen": "2026-01-26T10:30:00Z"
  }
}
```

---

## Codigos de Erro

| Codigo | Significado |
|--------|-------------|
| 200 | Sucesso |
| 400 | Requisicao invalida (parametros incorretos) |
| 401 | Nao autorizado (token invalido) |
| 404 | Recurso nao encontrado |
| 500 | Erro interno do servidor |
| 503 | Servico indisponivel (WhatsApp desconectado) |

---

## Exemplos de Uso com cURL

### Verificar Status

```bash
curl -s 'http://HOST:8080/session/status' \
  -H 'Token: SEU_TOKEN'
```

### Enviar Mensagem

```bash
curl -X POST 'http://HOST:8080/chat/send/text' \
  -H 'Token: SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"Phone": "5585999999999", "Body": "Ola!"}'
```

### Listar Usuarios (Admin)

```bash
curl -s 'http://HOST:8080/admin/users' \
  -H 'Authorization: ADMIN_TOKEN'
```

---

## Referencias

- [WuzAPI GitHub](https://github.com/asternic/wuzapi)
- [WhatsApp Web API (whatsmeow)](https://github.com/tulir/whatsmeow)
