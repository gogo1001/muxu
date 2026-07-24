import { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/app";
import { AppHeader } from "./HomeScreen";

type PlayerColor = "red" | "yellow" | "blue" | "green";

interface Plane {
  id: number;
  color: PlayerColor;
  position: number;
  isFinished: boolean;
}

interface Player {
  color: PlayerColor;
  planes: Plane[];
  finishedCount: number;
}

type GamePhase = "setup" | "playing" | "finished";

const COLORS: Record<PlayerColor, { main: string; light: string; dark: string; name: string }> = {
  red: { main: "#FF6B6B", light: "#FFE5E5", dark: "#E55555", name: "红" },
  yellow: { main: "#FFD93D", light: "#FFF8E1", dark: "#E6C235", name: "黄" },
  blue: { main: "#5C9EFF", light: "#E3EEFF", dark: "#4A8AE8", name: "蓝" },
  green: { main: "#6BCB77", light: "#E5F6E7", dark: "#5AB867", name: "绿" },
};

const PLAYER_ORDER: PlayerColor[] = ["red", "yellow", "green", "blue"];

const TOTAL_TRACK = 52;
const HOME_STRETCH_LENGTH = 6;

function createPlane(color: PlayerColor, id: number): Plane {
  return { id, color, position: -1, isFinished: false };
}

function createPlayer(color: PlayerColor): Player {
  return {
    color,
    planes: [0, 1, 2, 3].map((i) => createPlane(color, i)),
    finishedCount: 0,
  };
}

function getStartIndex(color: PlayerColor): number {
  const map: Record<PlayerColor, number> = { red: 0, yellow: 13, green: 26, blue: 39 };
  return map[color];
}

function getAbsolutePosition(plane: Plane): number {
  if (plane.position < 0) return -1;
  const startIdx = getStartIndex(plane.color);
  return (startIdx + plane.position) % TOTAL_TRACK;
}

function isOnHomeStretch(plane: Plane): boolean {
  return plane.position >= TOTAL_TRACK;
}

function canMove(plane: Plane, dice: number): boolean {
  if (plane.isFinished) return false;
  if (plane.position < 0) return dice === 6;
  if (plane.position + dice > TOTAL_TRACK + HOME_STRETCH_LENGTH - 1) return false;
  return true;
}

function getColorGridIndex(absPos: number): PlayerColor | null {
  const colorGrids: Record<PlayerColor, number[]> = {
    red: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48],
    yellow: [13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 1, 5, 9],
    green: [26, 30, 34, 38, 42, 46, 50, 2, 6, 10, 14, 18, 22],
    blue: [39, 43, 47, 51, 3, 7, 11, 15, 19, 23, 27, 31, 35],
  };
  for (const [color, grids] of Object.entries(colorGrids)) {
    if (grids.includes(absPos)) return color as PlayerColor;
  }
  return null;
}

function isJumpGrid(absPos: number, color: PlayerColor): boolean {
  const gridColor = getColorGridIndex(absPos);
  return gridColor === color;
}

export default function FlyChessApp({ onBack }: { onBack: () => void }) {
  const [gamePhase, setGamePhase] = useState<GamePhase>("setup");
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<Record<PlayerColor, Player>>({} as Record<PlayerColor, Player>);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>("red");
  const [dice, setDice] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [message, setMessage] = useState<string>("");
  const [cardPopup, setCardPopup] = useState<{ text: string; color: PlayerColor } | null>(null);

  // 从字卡库获取聊天字卡
  const contacts = useAppStore((s) => s.contacts);

  // 响应式适配状态
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissRotateHint, setDismissRotateHint] = useState(false);
  const [boardSize, setBoardSize] = useState(280);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const activePlayers = PLAYER_ORDER.slice(0, playerCount);

  // 通过 CSS media query (orientation: portrait) 检测屏幕方向
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 通过 ResizeObserver 检测棋盘容器实际尺寸
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width, rect.height);
      if (s > 0) setBoardSize(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const initGame = useCallback((count: number) => {
    const newPlayers: Record<PlayerColor, Player> = {} as Record<PlayerColor, Player>;
    for (let i = 0; i < count; i++) {
      const color = PLAYER_ORDER[i];
      newPlayers[color] = createPlayer(color);
    }
    setPlayers(newPlayers);
    setPlayerCount(count);
    setCurrentPlayerIndex(0);
    setCurrentPlayer(PLAYER_ORDER[0]);
    setDice(1);
    setHasRolled(false);
    setWinner(null);
    setMessage("");
    setGamePhase("playing");
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling || hasRolled || gamePhase !== "playing") return;
    setIsRolling(true);

    let rollCount = 0;
    const maxRolls = 15;
    const interval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(interval);
        const finalDice = Math.floor(Math.random() * 6) + 1;
        setDice(finalDice);
        setIsRolling(false);
        setHasRolled(true);

        // 投到6或1时，随机抽取聊天字卡显示
        if (finalDice === 6 || finalDice === 1) {
          const chatCards = contacts[0]?.cards?.chat || [];
          if (chatCards.length > 0) {
            const randomCard = chatCards[Math.floor(Math.random() * chatCards.length)];
            const cardText = randomCard.content || randomCard.name || "";
            if (cardText) {
              setCardPopup({ text: cardText, color: currentPlayer });
              setTimeout(() => setCardPopup(null), 30000);
            }
          }
        }

        const player = players[currentPlayer];
        const movablePlanes = player.planes.filter((p) => canMove(p, finalDice));
        if (movablePlanes.length === 0) {
          setMessage(`${COLORS[currentPlayer].name}方没有可移动的飞机，跳过回合`);
          setTimeout(() => {
            nextTurn();
          }, 1200);
        } else if (movablePlanes.length === 1) {
          setTimeout(() => {
            movePlane(movablePlanes[0].id);
          }, 500);
        } else {
          setMessage(`请选择要移动的飞机（投出 ${finalDice} 点）`);
        }
      }
    }, 80);
  }, [isRolling, hasRolled, gamePhase, currentPlayer, players, contacts]);

  const nextTurn = useCallback(() => {
    setHasRolled(false);
    setMessage("");
    const nextIdx = (currentPlayerIndex + 1) % playerCount;
    setCurrentPlayerIndex(nextIdx);
    setCurrentPlayer(PLAYER_ORDER[nextIdx]);
  }, [currentPlayerIndex, playerCount]);

  const movePlane = useCallback((planeId: number) => {
    if (!hasRolled || isRolling) return;

    const player = players[currentPlayer];
    const plane = player.planes.find((p) => p.id === planeId);
    if (!plane || !canMove(plane, dice)) return;

    let newPosition = plane.position;
    let extraJump = 0;

    if (newPosition < 0) {
      newPosition = 0;
    } else {
      newPosition += dice;
    }

    if (newPosition < TOTAL_TRACK) {
      const absPos = getAbsolutePosition({ ...plane, position: newPosition });
      if (isJumpGrid(absPos, plane.color)) {
        extraJump = 4;
      }
    }

    newPosition += extraJump;

    if (newPosition >= TOTAL_TRACK + HOME_STRETCH_LENGTH - 1) {
      newPosition = TOTAL_TRACK + HOME_STRETCH_LENGTH - 1;
    }

    const isFinished = newPosition === TOTAL_TRACK + HOME_STRETCH_LENGTH - 1;

    setPlayers((prev) => {
      const newPlayers = { ...prev };
      const newPlayer = { ...newPlayers[currentPlayer] };
      const newPlanes = newPlayer.planes.map((p) => {
        if (p.id === planeId) {
          return { ...p, position: newPosition, isFinished };
        }
        return p;
      });
      newPlayer.planes = newPlanes;
      newPlayer.finishedCount = newPlanes.filter((p) => p.isFinished).length;
      newPlayers[currentPlayer] = newPlayer;

      if (newPosition < TOTAL_TRACK && !isFinished) {
        const absPos = getAbsolutePosition({ ...plane, position: newPosition });
        for (const color of activePlayers) {
          if (color === currentPlayer) continue;
          const otherPlayer = newPlayers[color];
          if (!otherPlayer) continue;
          let hit = false;
          const updatedPlanes = otherPlayer.planes.map((p) => {
            if (!p.isFinished && p.position >= 0) {
              const otherAbsPos = getAbsolutePosition(p);
              if (otherAbsPos === absPos) {
                hit = true;
                return { ...p, position: -1 };
              }
            }
            return p;
          });
          if (hit) {
            newPlayers[color] = { ...otherPlayer, planes: updatedPlanes };
            setMessage(`💥 撞到了${COLORS[color].name}方飞机！`);
          }
        }
      }

      return newPlayers;
    });

    if (isFinished) {
      setTimeout(() => {
        setPlayers((prev) => {
          const p = prev[currentPlayer];
          if (p.finishedCount >= 4) {
            setWinner(currentPlayer);
            setGamePhase("finished");
          }
          return prev;
        });
        if (dice === 6) {
          setHasRolled(false);
          setMessage("🎉 到达终点！再投一次！");
        } else {
          setTimeout(() => nextTurn(), 1000);
        }
      }, 300);
    } else if (dice === 6 || extraJump > 0) {
      setTimeout(() => {
        setHasRolled(false);
        setMessage(extraJump > 0 ? "✨ 跳到同色格，再跳4格！再投一次！" : "🎲 投到6了！再投一次！");
      }, 500);
    } else {
      setTimeout(() => nextTurn(), 800);
    }
  }, [hasRolled, isRolling, currentPlayer, dice, players, activePlayers, nextTurn]);

  const getMovablePlaneIds = (): number[] => {
    if (!hasRolled || isRolling) return [];
    const player = players[currentPlayer];
    if (!player) return [];
    return player.planes.filter((p) => canMove(p, dice)).map((p) => p.id);
  };

  const movablePlaneIds = getMovablePlaneIds();

  const restartGame = () => {
    setGamePhase("setup");
    setWinner(null);
    setDismissRotateHint(false);
  };

  if (gamePhase === "setup") {
    return (
      <div className="flex h-full flex-col" style={{ touchAction: "manipulation" }}>
        <AppHeader title="✈️ 飞行棋" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">✈️</div>
            <div className="text-lg font-bold" style={{ color: "var(--text)" }}>飞行棋</div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>选择玩家数量开始游戏</div>
          </div>
          <div className="w-full space-y-3">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => initGame(count)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition active:scale-95"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--card-border)",
                  color: "var(--text)",
                  touchAction: "manipulation",
                }}
              >
                <div className="flex gap-1">
                  {PLAYER_ORDER.slice(0, count).map((c) => (
                    <div
                      key={c}
                      className="h-4 w-4 rounded-full"
                      style={{ background: COLORS[c].main }}
                    />
                  ))}
                </div>
                <span>{count} 人游戏</span>
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-xl p-3 text-xs" style={{ background: "var(--bg-deep)", color: "var(--text-soft)" }}>
            <div className="mb-1 font-bold" style={{ color: "var(--text)" }}>游戏规则：</div>
            <div>• 投到6点才能起飞</div>
            <div>• 撞到对方飞机撞回基地</div>
            <div>• 跳到同色格再跳4格</div>
            <div>• 先完成所有飞机获胜</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ touchAction: "manipulation" }}>
      <AppHeader title="✈️ 飞行棋" onBack={onBack} />

      <div className={`flex flex-1 overflow-hidden ${isPortrait ? "flex-col" : "flex-row"}`}>
        {/* 棋盘区域 - 自适应填充 */}
        <div
          ref={boardWrapRef}
          className={`flex items-center justify-center overflow-hidden p-1 ${
            isPortrait ? "min-h-0 flex-1" : "flex-1"
          }`}
        >
          <Board
            size={boardSize}
            players={players}
            activePlayers={activePlayers}
            movablePlaneIds={movablePlaneIds}
            currentPlayer={currentPlayer}
            onPlaneClick={movePlane}
          />
        </div>

        {/* 控制面板 - 横屏右侧 w-32 / 竖屏底部全宽 */}
        <div
          className={`flex gap-2 p-2 ${
            isPortrait
              ? "w-full flex-row items-center border-t"
              : "w-32 flex-col border-l"
          }`}
          style={{ borderColor: "var(--card-border)" }}
        >
          {/* 玩家状态 */}
          <div className={`flex gap-1 ${isPortrait ? "flex-1 flex-row flex-wrap" : "flex-col"}`}>
            <div className="text-[10px] font-bold" style={{ color: "var(--text-soft)" }}>玩家</div>
            {activePlayers.map((color, idx) => (
              <div
                key={color}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] ${
                  idx === currentPlayerIndex ? "font-bold" : ""
                }`}
                style={{
                  background: idx === currentPlayerIndex ? COLORS[color].light : "var(--card)",
                  color: idx === currentPlayerIndex ? COLORS[color].dark : "var(--text)",
                }}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[color].main }} />
                <span>{COLORS[color].name}</span>
                <span className="text-[9px]">{players[color]?.finishedCount || 0}/4</span>
              </div>
            ))}
          </div>

          {/* 骰子 + 当前回合 */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[9px] text-center" style={{ color: "var(--text-soft)" }}>
              <span style={{ color: COLORS[currentPlayer].main, fontWeight: "bold" }}>{COLORS[currentPlayer].name}</span>方
            </div>
            <button
              onClick={rollDice}
              disabled={isRolling || hasRolled || gamePhase !== "playing"}
              className="flex items-center justify-center p-1 transition active:scale-90 disabled:opacity-50"
              style={{ touchAction: "manipulation", minWidth: "44px", minHeight: "44px" }}
            >
              <Dice value={dice} isRolling={isRolling} color={COLORS[currentPlayer].main} />
            </button>
            {!hasRolled && !isRolling && (
              <div className="text-[9px]" style={{ color: "var(--text-soft)" }}>点击骰子</div>
            )}
          </div>

          {/* 消息 + 重开 */}
          <div className={`flex gap-1 ${isPortrait ? "flex-1 flex-col" : "flex-col"}`}>
            {message && (
              <div
                className="rounded-lg px-2 py-1 text-center text-[9px] leading-tight"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text)" }}
              >
                {message}
              </div>
            )}
            <button
              onClick={restartGame}
              className={`mt-auto rounded-lg py-1 text-[10px] ${isPortrait ? "" : "w-full"}`}
              style={{ background: "var(--bg-deep)", color: "var(--text-soft)", touchAction: "manipulation" }}
            >
              🔄 重开
            </button>
          </div>
        </div>
      </div>

      {/* 横屏旋转提示 - 仅在 playing 阶段且竖屏时显示 */}
      {gamePhase === "playing" && isPortrait && !dismissRotateHint && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
          style={{ background: "rgba(0,0,0,0.85)", color: "#fff" }}
        >
          <div className="rotate-hint-icon mb-4 text-6xl">📱</div>
          <div className="mb-1 text-base font-bold">请旋转手机至横屏以获得更好体验</div>
          <button
            onClick={() => setDismissRotateHint(true)}
            className="mt-5 rounded-full border border-white/40 px-4 py-1.5 text-xs"
            style={{ touchAction: "manipulation" }}
          >
            继续竖屏玩
          </button>
        </div>
      )}

      {/* 字卡弹窗 - 投到6或1时随机抽取聊天字卡，30秒后消失 */}
      {cardPopup && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setCardPopup(null)}
        >
          <div
            className="w-full max-w-xs animate-popIn rounded-2xl p-5 text-center shadow-2xl"
            style={{
              background: "var(--card)",
              border: `2px solid ${COLORS[cardPopup.color].main}`,
            }}
          >
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ background: COLORS[cardPopup.color].main }} />
              <span className="text-xs font-bold" style={{ color: COLORS[cardPopup.color].dark }}>
                {COLORS[cardPopup.color].name}方 抽到字卡
              </span>
            </div>
            <div
              className="mb-3 rounded-xl px-4 py-4 text-sm font-medium leading-relaxed"
              style={{ background: COLORS[cardPopup.color].light, color: "var(--text)" }}
            >
              {cardPopup.text}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-soft)" }}>
              30秒后自动关闭 · 点击任意位置关闭
            </div>
          </div>
        </div>
      )}

      {gamePhase === "finished" && winner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div
            className="mx-6 w-full max-w-xs rounded-2xl p-6 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <div className="mb-2 text-5xl">🎉</div>
            <div className="mb-1 text-lg font-bold" style={{ color: "var(--text)" }}>游戏结束</div>
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-4 w-4 rounded-full" style={{ background: COLORS[winner].main }} />
              <span className="text-sm" style={{ color: COLORS[winner].dark }}>{COLORS[winner].name}方获胜！</span>
            </div>
            <button
              onClick={restartGame}
              className="w-full rounded-xl py-2 text-sm font-medium"
              style={{ background: COLORS[winner].main, color: "#fff", touchAction: "manipulation" }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dice({ value, isRolling, color }: { value: number; isRolling: boolean; color: string }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };

  const dots = dotPositions[value] || [];

  return (
    <div
      className={`relative h-16 w-16 rounded-xl shadow-lg ${isRolling ? "dice-roll" : ""}`}
      style={{
        background: `linear-gradient(145deg, #ffffff, #f0f0f0)`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)`,
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            background: color,
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.2)`,
          }}
        />
      ))}
    </div>
  );
}

function Board({
  size,
  players,
  activePlayers,
  movablePlaneIds,
  currentPlayer,
  onPlaneClick,
}: {
  size: number;
  players: Record<PlayerColor, Player>;
  activePlayers: PlayerColor[];
  movablePlaneIds: number[];
  currentPlayer: PlayerColor;
  onPlaneClick: (planeId: number) => void;
}) {
  const cellSize = size / 14.5;
  const center = size / 2;

  const gridPositions: { x: number; y: number }[] = [];
  for (let i = 0; i <= 12; i++) {
    gridPositions.push({ x: center - cellSize * 6 + i * cellSize, y: cellSize * 2 });
  }
  for (let i = 1; i <= 12; i++) {
    gridPositions.push({ x: size - cellSize * 3, y: cellSize * 2 + i * cellSize });
  }
  for (let i = 1; i <= 12; i++) {
    gridPositions.push({ x: size - cellSize * 3 - i * cellSize, y: size - cellSize * 3 });
  }
  for (let i = 1; i <= 12; i++) {
    gridPositions.push({ x: cellSize * 2, y: size - cellSize * 3 - i * cellSize });
  }

  const homePositions: Record<PlayerColor, { x: number; y: number }[]> = {
    red: [
      { x: cellSize * 0.5, y: cellSize * 0.5 },
      { x: cellSize * 1.5, y: cellSize * 0.5 },
      { x: cellSize * 0.5, y: cellSize * 1.5 },
      { x: cellSize * 1.5, y: cellSize * 1.5 },
    ],
    yellow: [
      { x: size - cellSize * 2.5, y: cellSize * 0.5 },
      { x: size - cellSize * 1.5, y: cellSize * 0.5 },
      { x: size - cellSize * 2.5, y: cellSize * 1.5 },
      { x: size - cellSize * 1.5, y: cellSize * 1.5 },
    ],
    green: [
      { x: size - cellSize * 2.5, y: size - cellSize * 2.5 },
      { x: size - cellSize * 1.5, y: size - cellSize * 2.5 },
      { x: size - cellSize * 2.5, y: size - cellSize * 1.5 },
      { x: size - cellSize * 1.5, y: size - cellSize * 1.5 },
    ],
    blue: [
      { x: cellSize * 0.5, y: size - cellSize * 2.5 },
      { x: cellSize * 1.5, y: size - cellSize * 2.5 },
      { x: cellSize * 0.5, y: size - cellSize * 1.5 },
      { x: cellSize * 1.5, y: size - cellSize * 1.5 },
    ],
  };

  const baseColors: Record<PlayerColor, string> = {
    red: COLORS.red.light,
    yellow: COLORS.yellow.light,
    green: COLORS.green.light,
    blue: COLORS.blue.light,
  };

  const homeStretchPositions: Record<PlayerColor, { x: number; y: number }[]> = {
    red: [],
    yellow: [],
    green: [],
    blue: [],
  };

  for (let i = 0; i < 6; i++) {
    homeStretchPositions.red.push({ x: center - cellSize * 2 + i * cellSize, y: center - cellSize * 2 + i * cellSize });
  }
  for (let i = 0; i < 6; i++) {
    homeStretchPositions.yellow.push({ x: center + cellSize * 2 - i * cellSize, y: center - cellSize * 2 + i * cellSize });
  }
  for (let i = 0; i < 6; i++) {
    homeStretchPositions.green.push({ x: center + cellSize * 2 - i * cellSize, y: center + cellSize * 2 - i * cellSize });
  }
  for (let i = 0; i < 6; i++) {
    homeStretchPositions.blue.push({ x: center - cellSize * 2 + i * cellSize, y: center + cellSize * 2 - i * cellSize });
  }

  const centerAreaColors: Record<PlayerColor, string> = {
    red: COLORS.red.main,
    yellow: COLORS.yellow.main,
    green: COLORS.green.main,
    blue: COLORS.blue.main,
  };

  const getPlanePosition = (plane: Plane): { x: number; y: number } | null => {
    if (plane.position < 0) {
      return homePositions[plane.color][plane.id];
    }
    if (plane.position >= TOTAL_TRACK) {
      const idx = plane.position - TOTAL_TRACK;
      if (idx >= 0 && idx < HOME_STRETCH_LENGTH) {
        return homeStretchPositions[plane.color][idx];
      }
      return null;
    }
    const absPos = getAbsolutePosition(plane);
    return gridPositions[absPos];
  };

  const allPlanes: { plane: Plane; pos: { x: number; y: number } }[] = [];
  for (const color of activePlayers) {
    const player = players[color];
    if (!player) continue;
    for (const plane of player.planes) {
      if (plane.isFinished) continue;
      const pos = getPlanePosition(plane);
      if (pos) {
        allPlanes.push({ plane, pos });
      }
    }
  }

  const positionCounts: Record<string, number> = {};
  allPlanes.forEach(({ pos, plane }) => {
    const key = `${pos.x},${pos.y},${plane.color}`;
    positionCounts[key] = (positionCounts[key] || 0) + 1;
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "manipulation", display: "block" }}
    >
      <defs>
        {Object.entries(COLORS).map(([color, c]) => (
          <radialGradient key={color} id={`plane-grad-${color}`} cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
            <stop offset="100%" stopColor={c.main} />
          </radialGradient>
        ))}
      </defs>

      <rect x={0} y={0} width={size} height={size} fill="var(--bg-deep)" rx="12" />

      <rect x={0} y={0} width={cellSize * 2.2} height={cellSize * 2.2} fill={baseColors.red} rx="8" />
      <rect x={size - cellSize * 2.2} y={0} width={cellSize * 2.2} height={cellSize * 2.2} fill={baseColors.yellow} rx="8" />
      <rect x={size - cellSize * 2.2} y={size - cellSize * 2.2} width={cellSize * 2.2} height={cellSize * 2.2} fill={baseColors.green} rx="8" />
      <rect x={0} y={size - cellSize * 2.2} width={cellSize * 2.2} height={cellSize * 2.2} fill={baseColors.blue} rx="8" />

      {gridPositions.map((pos, i) => {
        const color = getColorGridIndex(i);
        return (
          <g key={i}>
            <rect
              x={pos.x}
              y={pos.y}
              width={cellSize - 1}
              height={cellSize - 1}
              rx="3"
              fill={color ? COLORS[color].light : "#fff"}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.5"
            />
            {[0, 13, 26, 39].includes(i) && (
              <circle cx={pos.x + cellSize / 2 - 0.5} cy={pos.y + cellSize / 2 - 0.5} r="5" fill={COLORS[PLAYER_ORDER[Math.floor(i / 13)]].main} opacity="0.6" />
            )}
          </g>
        );
      })}

      {Object.entries(homeStretchPositions).map(([color, positions]) => (
        <g key={color}>
          {positions.map((pos, i) => (
            <rect
              key={i}
              x={pos.x}
              y={pos.y}
              width={cellSize - 1}
              height={cellSize - 1}
              rx="3"
              fill={COLORS[color as PlayerColor].light}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}

      <polygon
        points={`${center - cellSize * 2.5},${center - cellSize * 2.5} ${center + cellSize * 2.5},${center - cellSize * 2.5} ${center + cellSize * 2.5},${center + cellSize * 2.5} ${center - cellSize * 2.5},${center + cellSize * 2.5}`}
        fill="var(--bg-deep)"
      />
      <polygon
        points={`${center},${center - cellSize * 2.5} ${center + cellSize * 2.5},${center} ${center},${center + cellSize * 2.5} ${center - cellSize * 2.5},${center}`}
        fill="var(--bg-deep)"
      />

      {Object.entries(centerAreaColors).map(([color, c], i) => {
        const angle = (i * 90 - 45) * (Math.PI / 180);
        return (
          <path
            key={color}
            d={`M ${center} ${center} L ${center + Math.cos(angle - Math.PI / 4) * cellSize * 2.2} ${center + Math.sin(angle - Math.PI / 4) * cellSize * 2.2} A ${cellSize * 2.2} ${cellSize * 2.2} 0 0 1 ${center + Math.cos(angle + Math.PI / 4) * cellSize * 2.2} ${center + Math.sin(angle + Math.PI / 4) * cellSize * 2.2} Z`}
            fill={c}
            opacity="0.4"
          />
        );
      })}

      {allPlanes.map(({ plane, pos }) => {
        const isMovable = movablePlaneIds.includes(plane.id) && plane.color === currentPlayer;
        const key = `${pos.x},${pos.y},${plane.color}`;
        const count = positionCounts[key] || 1;
        const offset = count > 1 ? ((plane.id % 2) - 0.5) * 4 : 0;
        const offsetY = count > 2 ? (Math.floor(plane.id / 2) - 0.5) * 4 : 0;
        const cx = pos.x + cellSize / 2 - 0.5 + offset;
        const cy = pos.y + cellSize / 2 - 0.5 + offsetY;

        return (
          <g
            key={`${plane.color}-${plane.id}`}
            style={{ cursor: isMovable ? "pointer" : "default" }}
            onClick={() => isMovable && onPlaneClick(plane.id)}
          >
            {isMovable && (
              <circle
                cx={cx}
                cy={cy}
                r={cellSize * 0.55}
                fill="transparent"
                pointerEvents="all"
              />
            )}
            {isMovable && (
              <circle
                cx={cx}
                cy={cy}
                r="10"
                fill="none"
                stroke={COLORS[plane.color].main}
                strokeWidth="2"
                className="pulse-ring"
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r="7"
              fill={`url(#plane-grad-${plane.color})`}
              stroke={COLORS[plane.color].dark}
              strokeWidth="1"
            />
            <circle
              cx={cx - 2.5}
              cy={cy - 2.5}
              r="2"
              fill="#fff"
              opacity="0.7"
            />
          </g>
        );
      })}
    </svg>
  );
}
