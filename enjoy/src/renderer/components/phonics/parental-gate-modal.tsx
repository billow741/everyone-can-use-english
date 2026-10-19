import React, { useState, useEffect } from "react";
import {
  XIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HelpCircleIcon,
  LockIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from "@renderer/components/ui";

interface ParentalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ParentalGateModal: React.FC<ParentalGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [num1, setNum1] = useState(3);
  const [num2, setNum2] = useState(7);
  const [userAnswer, setUserAnswer] = useState("");
  const [isError, setIsError] = useState(false);

  // 每次打开随机生成一个适合家长的简单乘法算式 (如 4 × 7, 6 × 8)
  useEffect(() => {
    if (isOpen) {
      const n1 = Math.floor(Math.random() * 6) + 4; // 4 ~ 9
      const n2 = Math.floor(Math.random() * 6) + 3; // 3 ~ 8
      setNum1(n1);
      setNum2(n2);
      setUserAnswer("");
      setIsError(false);
    }
  }, [isOpen]);

  const correctAnswer = num1 * num2;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (parseInt(userAnswer.trim(), 10) === correctAnswer) {
      sessionStorage.setItem("sunnybridge_parent_auth", "true");
      onSuccess();
    } else {
      setIsError(true);
      setUserAnswer("");
      setTimeout(() => setIsError(false), 1200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6 rounded-3xl border-2 border-purple-400/50 bg-card shadow-2xl text-center space-y-4">
        <DialogHeader className="sr-only">
          <DialogTitle>家长模式验证门</DialogTitle>
        </DialogHeader>

        <div className="mx-auto size-14 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center text-2xl shadow-xs border border-purple-400/30">
          <ShieldCheckIcon className="size-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-foreground">
            家长专属验证门
          </h3>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            为了避免小朋友误入学术看板破坏沉浸感，请家长回答下方算式以进入：
          </p>
        </div>

        {/* 算式卡片 */}
        <div className="py-3 px-4 rounded-2xl bg-muted/60 border border-border flex items-center justify-center gap-3">
          <span className="text-2xl font-black font-mono text-foreground">
            {num1} × {num2} = ?
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="请输入数字答案"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              setIsError(false);
            }}
            className={`h-12 text-center text-lg font-black font-mono rounded-2xl bg-background ${
              isError ? "border-rose-500 ring-2 ring-rose-400/30 animate-shake" : "border-border"
            }`}
            autoFocus
          />

          {isError && (
            <p className="text-xs font-black text-rose-500 animate-pulse">
              答案不对哦，请重新计算
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-xs font-black"
            >
              我是小朋友，返回
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-1 shadow-md shadow-purple-500/20"
            >
              <span>确认进入</span>
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
