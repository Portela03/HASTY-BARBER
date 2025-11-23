# Dashboard - Componentes Refatorados

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── DashboardHeader.tsx      # Cabeçalho com menu de usuário
│   │   ├── OnboardingBanner.tsx     # Banner de onboarding para proprietários
│   │   ├── DashboardCard.tsx        # Card reutilizável para ações
│   │   └── index.ts                 # Exportações centralizadas
│   │
│   └── common/
│       └── ConfirmationModal.tsx    # Modal de confirmação genérico
│
├── hooks/
│   ├── useProfile.ts                # Lógica de perfil do usuário
│   └── useBarbershop.ts             # Lógica de edição de barbearia
│
└── Dashboard.tsx                    # Componente principal (simplificado)
```

## 🎯 Componentes Criados

### 1. **DashboardHeader**
Cabeçalho fixo com menu dropdown do usuário.

**Props:**
- `user`: Dados do usuário logado
- `uploadingAvatar`: Estado de upload da foto
- `onAvatarClick`: Callback para alterar foto
- `onProfileClick`: Callback para abrir perfil
- `onBarbershopClick`: Callback para editar barbearia
- `onLogout`: Callback para sair
- `menuOpen`: Estado do menu
- `setMenuOpen`: Função para controlar menu
- `menuRef`: Ref para fechar menu ao clicar fora

**Uso:**
```tsx
<DashboardHeader
  user={user}
  uploadingAvatar={uploadingUserAvatar}
  onAvatarClick={openUserFilePicker}
  onProfileClick={openProfileModal}
  onBarbershopClick={openBarbershopModal}
  onLogout={handleLogout}
  menuOpen={headerMenuOpen}
  setMenuOpen={setHeaderMenuOpen}
  menuRef={headerMenuRef}
/>
```

### 2. **OnboardingBanner**
Banner informativo para guiar proprietários no cadastro inicial.

**Props:**
- `onboarding`: Objeto com status de cadastro
  - `missingHours`: boolean
  - `missingBarbers`: boolean
  - `missingServices`: boolean
  - `barbershopId`: number | null
- `onDismiss`: Callback para fechar o banner

**Uso:**
```tsx
{user.tipo_usuario === 'proprietario' && showOnboardingBanner && (
  <OnboardingBanner
    onboarding={onboarding}
    onDismiss={() => setShowOnboardingBanner(false)}
  />
)}
```

### 3. **DashboardCard**
Card interativo reutilizável para ações do dashboard.

**Props:**
- `icon`: Ícone SVG do card
- `title`: Título da ação
- `description`: Descrição breve
- `actionText`: Texto do botão
- `onClick`: Callback ao clicar
- `badge?`: Texto opcional do badge (ex: "Popular", "Novo")
- `fullWidth?`: Se deve ocupar largura completa

**Uso:**
```tsx
<DashboardCard
  icon={<svg>...</svg>}
  title="Cadastrar Barbeiro"
  description="Adicione novos profissionais à equipe"
  actionText="Cadastrar"
  onClick={() => setShowBarbers(true)}
  badge="Popular"
/>
```

### 4. **ConfirmationModal**
Modal genérico de confirmação com variantes visuais.

**Props:**
- `isOpen`: boolean
- `title`: Título do modal
- `message`: Mensagem de confirmação
- `confirmText?`: Texto do botão confirmar (padrão: "Confirmar")
- `cancelText?`: Texto do botão cancelar (padrão: "Cancelar")
- `onConfirm`: Callback de confirmação
- `onCancel`: Callback de cancelamento
- `variant?`: 'success' | 'danger' | 'warning' (padrão: 'danger')
- `icon?`: Ícone customizado (opcional)

**Uso:**
```tsx
<ConfirmationModal
  isOpen={showDeleteBarberModal}
  title="Excluir Barbeiro?"
  message="Tem certeza que deseja excluir este barbeiro?"
  confirmText="Excluir"
  cancelText="Cancelar"
  variant="danger"
  onConfirm={executeDeleteBarber}
  onCancel={() => setShowDeleteBarberModal(false)}
  icon={<svg>...</svg>}
/>
```

## 🪝 Custom Hooks

### 1. **useProfile**
Gerencia estado e lógica do perfil do usuário.

**Parâmetros:**
- `user`: Usuário atual
- `token`: Token de autenticação
- `login`: Função de login
- `onSuccess`, `onError`, `onWarning`: Callbacks de toast

**Retorna:**
- Estados: `showProfileModal`, `profileNome`, `profileEmail`, `profileTelefone`, `isUpdating`
- Setters: `setShowProfileModal`, `setProfileNome`, `setProfileEmail`, `setProfileTelefone`
- Funções: `openProfileModal`, `handleSaveProfile`, `formatPhoneBR`

**Uso:**
```tsx
const profileHook = useProfile({
  user,
  token,
  login,
  onSuccess: success,
  onError: showError,
  onWarning: warning,
});
```

### 2. **useBarbershop**
Gerencia edição de dados da barbearia.

**Parâmetros:**
- `selectedShopId`: ID da barbearia selecionada
- `setSelectedShopId`: Setter do ID
- `barbershops`: Lista de barbearias
- `setBarbershops`: Setter da lista
- `onSuccess`, `onError`, `onWarning`: Callbacks de toast

**Retorna:**
- Estados: `showBarbershopModal`, `bsNome`, `bsEndereco`, `bsTelefone`, `bsHorario`, `isUpdating`
- Setters: `setShowBarbershopModal`, `setBsNome`, `setBsEndereco`, `setBsTelefone`, `setBsHorario`
- Funções: `openBarbershopModal`, `handleSaveBarbershop`

## 📊 Benefícios da Refatoração

### ✅ Manutenibilidade
- Componentes menores e mais focados
- Responsabilidade única (Single Responsibility Principle)
- Mais fácil de testar e debugar

### ✅ Reutilização
- `DashboardCard` pode ser usado em outras páginas
- `ConfirmationModal` serve para qualquer confirmação
- Hooks podem ser reutilizados em outros contextos

### ✅ Performance
- Componentes menores = re-renders mais eficientes
- Lógica isolada em hooks = melhor otimização

### ✅ Legibilidade
- Código mais limpo e organizado
- Props tipadas com TypeScript
- Fácil entender o que cada componente faz

### ✅ Escalabilidade
- Fácil adicionar novos cards e funcionalidades
- Estrutura preparada para crescimento
- Padrões consistentes

## 🔄 Próximos Passos Recomendados

1. **Criar mais hooks especializados:**
   - `useBookings` - gerenciar agendamentos
   - `useBarbers` - gerenciar barbeiros
   - `useServices` - gerenciar serviços
   - `useReviews` - gerenciar avaliações

2. **Componentizar Slide-overs:**
   - `BookingsSlideOver`
   - `BarbersSlideOver`
   - `ServicesSlideOver`

3. **Criar componentes de formulário:**
   - `FormInput`
   - `FormSelect`
   - `FormTextarea`

4. **Adicionar testes:**
   - Testes unitários para hooks
   - Testes de componente para UI
   - Testes de integração

5. **Otimizações:**
   - Implementar React.memo() onde necessário
   - Usar useCallback e useMemo
   - Code splitting com React.lazy()

## 📝 Exemplo de Refatoração do Dashboard

**Antes (3400+ linhas):**
```tsx
const Dashboard = () => {
  // 100+ linhas de useState
  // 500+ linhas de funções
  // 2800+ linhas de JSX
  return <div>...</div>
}
```

**Depois (estimado 300-500 linhas):**
```tsx
const Dashboard = () => {
  const profileHook = useProfile({...});
  const barbershopHook = useBarbershop({...});
  
  return (
    <div>
      <DashboardHeader {...headerProps} />
      <main>
        {onboardingNeeded && <OnboardingBanner {...} />}
        <div className="grid">
          <DashboardCard {...card1Props} />
          <DashboardCard {...card2Props} />
        </div>
      </main>
      <Toasts />
      <Modals />
    </div>
  );
}
```

## 🎨 Design System

Todos os componentes seguem o design system estabelecido:

**Cores:**
- Primary: `from-amber-500 to-yellow-600`
- Background: `from-gray-950 via-gray-900 to-black`
- Cards: `from-gray-800 to-gray-900`
- Border: `border-gray-700` com hover `border-amber-500/50`

**Efeitos:**
- Hover scale: `hover:scale-105`
- Shadow: `hover:shadow-xl hover:shadow-amber-500/10`
- Backdrop blur: `backdrop-blur-xl`
- Transitions: `transition-all duration-300`

**Espaçamento:**
- Padding cards: `p-6`
- Gap: `gap-4`, `gap-6`
- Rounded: `rounded-2xl`, `rounded-xl`
