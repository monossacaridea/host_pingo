#pragma once
// ===== Dados do projeto Firebase (Configurações do projeto > Geral) =====
#define FIREBASE_API_KEY    "AIzaSyBuOgTPNQh8UF54kNZNHXjjxHd_EyZqYlA"
#define FIREBASE_PROJECT_ID "pingo-42ced"

// Cria sozinho a conta "<id>@devices.pingo.app" no primeiro boot (senha aleatória guardada na flash).
// Dispensa o passo manual no console. Para produção, desligue (false) e crie as contas por script.
#define AUTO_PROVISION true

// ===== Hardware =====
#define RELAY_PIN          26
#define RELAY_ACTIVE_LOW   true     // módulos de relé comuns acionam em LOW
#define RESET_BUTTON_PIN   0        // botão BOOT: segure 3 s ao ligar para apagar o Wi-Fi salvo

// Sensor de fluxo (ex.: YF-S201) instalado NO CANO DE DRENAGEM da máquina, ANTES da válvula de desvio.
// Ele detecta cada escoamento (lavagem/enxágues/centrifugação) e mede os litros reais.
#define USE_FLOW_SENSOR        true
#define FLOW_PIN               27
#define FLOW_PULSES_PER_LITER  450.0f   // YF-S201: ~450 pulsos/L (calibre com um balde de 10 L)
#define FLOW_LITERS_PER_MIN    6.0f     // usado só se USE_FLOW_SENSOR=false (estimativa por tempo)

// ===== Modo automático (precisa do sensor de fluxo) =====
#define DRAIN_END_IDLE_MS      8000UL                  // sem pulsos por 8 s = escoamento terminou
#define NEW_WASH_IDLE_MS       (15UL * 60UL * 1000UL)  // 15 min sem escoar = próxima lavagem recomeça a contagem
// Ordem assumida dos escoamentos de uma lavagem:
//  1 = lavagem principal | 2 = 1º enxágue | 3 = 2º enxágue | 4 = centrifugação
// Ajuste em captureThisDrain() (arquivo .ino) se a sua máquina fizer diferente.

// ===== Tempos e segurança =====
#define POLL_INTERVAL_MS        5000UL     // leitura de comandos/config
#define UNLINKED_POLL_MS        15000UL    // enquanto o app ainda não vinculou o dispositivo
#define HEARTBEAT_INTERVAL_MS   30000UL    // envio de status (o app considera offline após 45 s)
#define MAX_VALVE_OPEN_MS       (30UL * 60UL * 1000UL)  // failsafe: fecha após 30 min aberta
#define OFFLINE_FAILSAFE_MS     (10UL * 60UL * 1000UL)  // fecha se ficar 10 min sem falar com a nuvem
#define NTP_TIMEOUT_MS          20000UL

#define FIRMWARE_VERSION "v1.2.0"
