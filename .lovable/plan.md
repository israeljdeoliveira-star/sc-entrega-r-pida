

## Sistema de Simulação de Frete - Santa Catarina

### 1. Configuração do Banco de Dados (Supabase)
- Tabela `profiles` (id, email, created_at)
- Tabela `user_roles` (id, user_id, role enum: admin/user)
- Tabela `cities` (id, name, state, min_value, is_active)
- Tabela `neighborhoods` (id, city_id, name, additional_fee)
- Tabela `freight_settings` (id, price_per_km_moto, price_per_km_car, updated_at)
- RLS policies para proteger os dados, usando função `has_role` para acesso admin

### 2. Autenticação
- Página de login com email/senha
- Proteção de rotas: painel admin só para usuários com role "admin"
- Redirecionamento automático baseado no papel do usuário

### 3. Painel Administrativo
- **Gerenciar Cidades**: cadastrar/editar/remover cidades de SC com valor mínimo
- **Gerenciar Bairros**: cadastrar bairros por cidade com taxa adicional opcional
- **Configurações de Frete**: definir valor por KM para moto e carro

### 4. Página de Simulação de Frete (pública)
- Formulário com:
  - Cidade de origem (select) + Bairro de origem (select filtrado)
  - Cidade de destino (select) + Bairro de destino (select filtrado)
  - Tipo de veículo: Moto ou Carro
- Validação: bloquear se cidade não cadastrada
- Cálculo automático da distância via OpenRouteService (geocoding dos endereços + cálculo de rota)
- Exibição do resultado:
  - Distância em KM
  - Valor base (distância × preço/km)
  - Taxa adicional dos bairros (se houver)
  - Valor mínimo aplicado (se valor calculado for menor)
  - **Valor final do frete**

### 5. Edge Function para Cálculo
- Edge function que recebe origem/destino, consulta OpenRouteService, calcula distância e retorna o valor (protege a API key)

### 6. Design e UX
- Interface limpa e responsiva
- Cards com resultado claro do valor
- Feedback visual para erros (cidade não cadastrada, distância não calculada)
- Cores e identidade visual profissional

