# Deploy - Mercado Virtual

## Arquitetura

```
Local (Windows)          GitHub             VPS (Kinghost)
┌──────────────┐     ┌──────────┐     ┌──────────────────┐
│  Desenvolve  │────>│  origin  │────>│  git pull + build │
│  git push    │     │  main    │     │  Nginx serve dist │
└──────────────┘     └──────────┘     └──────────────────┘
```

- **Local**: `C:\Users\eve-m\Documents\Everton\Projetos\MercadoVirtual`
- **VPS**: `/var/www/mercadovirtual`
- **Nginx**: serve `/var/www/mercadovirtual/dist` (SPA com fallback para index.html)
- **Dominio**: `mercadovirtual.app` + `*.mercadovirtual.app` (subdominos)

## Fluxo de Deploy

### 1. Desenvolver localmente

```bash
npm run dev
```

Acesse `http://localhost:5173` (rotas usam formato `/app/:slug/*` em localhost).

### 2. Commitar e push

```bash
git add .
git commit -m "descricao da mudanca"
git push origin main
```

### 3. Conectar na VPS e atualizar

```bash
ssh evertonapi
cd /var/www/mercadovirtual
git pull origin main
npm run build
```

Pronto. O Nginx ja serve os novos arquivos do `dist/`.

### Comando unico (sem entrar na VPS)

```bash
ssh evertonapi "cd /var/www/mercadovirtual && git pull origin main && npm run build"
```

## Acesso SSH

- **Alias**: `ssh evertonapi`
- **Deploy key**: `~/.ssh/id_ed25519_saas` (configurada no `~/.ssh/config` como `github-saas`)
- **Remote na VPS**: `git@github-saas:Evemarques07/saas.git`

## Nginx

- Config: `/etc/nginx/sites-available/mercadovirtual.app`
- SSL: Let's Encrypt (certificados em `/etc/letsencrypt/live/mercadovirtual.app/`)
- Cache: `no-store` para HTML, `1y immutable` para assets com hash

## Rollback

Se algo der errado apos o deploy:

```bash
# Na VPS, voltar para o commit anterior
ssh evertonapi "cd /var/www/mercadovirtual && git log --oneline -5"
# Anotar o hash do commit anterior e:
ssh evertonapi "cd /var/www/mercadovirtual && git checkout <hash-anterior> -- . && npm run build"
```
