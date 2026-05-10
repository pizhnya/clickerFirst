# Epoch Clicker Prototype (3D)

Браузерный 3D idle/clicker прототип с циклом прогрессии:

- Автобег между столкновениями.
- Бой кликами + idle DPS.
- 10 стейджей на зону, 10-й — босс.
- Сохранение в `localStorage`.
- Оффлайн прогресс (с капом 8 часов).
- Ascend (после достижения global stage 50+).
- Мета-апгрейды за Essence (урон и золото).

## Формулы MVP

- `enemyHp(zone, stage) = ceil((10 * (zone + 1.55^zone)) * (1 + stage*0.12) * bossMultiplier)`
- `bossMultiplier = 8`, если `stage = 10`, иначе `1`
- `enemyGold(zone, stage) = floor(ceil((4 * 1.15^(zone-1)) * (1 + stage*0.08)) * goldMultiplier)`
- `ascendReward = floor((highestStage / 15)^1.8)` при `highestStage >= 50`

## Управление

- Клик по врагу — наносит урон.
- `Upgrade Click` — увеличивает клик-урон.
- `Upgrade Idle` — увеличивает авто-DPS.
- `Ascend` — сбрасывает ран-прогресс и выдаёт Essence.
- Мета-кнопки тратят Essence на перманентные бонусы.

## Запуск

Открой `index.html` в браузере.
