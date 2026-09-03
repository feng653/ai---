globalThis.AgentHarnessRuntime = (() => {
  class DemoRuntime {
    constructor(onEvent, delayScale = 1) {
      this.onEvent = onEvent;
      this.delayScale = delayScale;
      this.active = false;
      this.waiting = null;
      this.plan = null;
      this.token = 0;
      this.timer = null;
      this.releaseDelay = null;
    }

    emit(type, fields = {}) {
      this.onEvent({ type, runId: this.plan?.runId, ...fields });
    }

    delay(ms, token) {
      return new Promise((resolve) => {
        const done = () => {
          if (this.timer) clearTimeout(this.timer);
          this.timer = null;
          this.releaseDelay = null;
          resolve(token === this.token);
        };
        this.releaseDelay = done;
        this.timer = setTimeout(done, Math.max(0, ms * this.delayScale));
      });
    }

    async play(events, token) {
      for (const item of events) {
        const current = await this.delay(item.delay ?? 0, token);
        if (!current || !this.active || token !== this.token) return false;
        const { delay: _delay, ...payload } = item;
        this.onEvent({ ...payload, runId: this.plan.runId });
        if (payload.type === "approval") {
          this.waiting = payload;
          return false;
        }
      }
      return true;
    }

    async start(plan) {
      if (this.active) return false;
      this.plan = plan;
      this.active = true;
      this.waiting = null;
      const token = ++this.token;
      this.emit("runStart", { intent: plan.intent });
      const finished = await this.play(plan.beforeApproval, token);
      if (finished && this.active && token === this.token) this.complete();
      return true;
    }

    async resolveApproval(approved) {
      if (!this.active || !this.waiting) return false;
      const waiting = this.waiting;
      this.waiting = null;
      this.emit("approvalResolved", {
        approvalId: waiting.approvalId,
        callId: waiting.callId,
        approved,
      });
      const token = this.token;
      const branch = approved ? this.plan.approved : this.plan.rejected;
      const finished = await this.play(branch, token);
      if (finished && this.active && token === this.token) this.complete();
      return true;
    }

    cancel() {
      if (!this.active) return false;
      this.active = false;
      this.waiting = null;
      this.token += 1;
      this.releaseDelay?.();
      this.emit("cancelled");
      return true;
    }

    complete() {
      this.active = false;
      this.waiting = null;
      this.emit("runComplete");
    }
  }

  return { DemoRuntime };
})();
