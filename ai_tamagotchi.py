"""
AI Tamagotchi Game
==================

This script implements a minimal text‑based role‑playing game in which you
raise an AI avatar by chatting with it.  Under the hood it uses a local
open‑source large language model (LLM) to generate responses.  As you teach
your AI new concepts through the conversation, it gains experience points (XP)
and levels up.

The goal of the project is to offer a modern take on the classic Tamagotchi
virtual pet, but instead of feeding and cleaning a digital creature you
encourage an AI to grow by sharing knowledge.  The game loop is kept very
simple for clarity and can be extended to include additional metrics or
commands.

Usage
-----

1. **Install dependencies**

   Install Python packages for loading quantised LLMs.  At the time of writing
   (late 2025) the transformers library supports many open models via the
   `BitsAndBytesConfig` class, which enables 8‑bit or 4‑bit quantisation.  For
   a machine with limited RAM the Microsoft **Phi‑3 Mini** model (3.8 billion
   parameters) or Google’s **Gemma 3 1B** model are good candidates.  These
   models are instruction‑tuned and designed to run on consumer hardware【452534709863228†L144-L150】【82067781623453†L360-L382】.

   You will need to have Python 3.9+ installed.  Then run:

   ```bash
   pip install --upgrade "transformers>=4.50.0" accelerate bitsandbytes
   ```

2. **Download a model**

   You can load any compatible instruction‑tuned model supported by
   `transformers`.  Examples of popular open‑source models that can be run
   locally in 2025 include:

     * **Phi‑3 Mini (3.8B)** – Microsoft’s small language model, described as
       lightweight yet capable and able to run on resource‑constrained devices
       like smartphones【452534709863228†L144-L150】.  It can outperform models
       of similar size on reasoning and coding tasks【452534709863228†L162-L176】.

     * **Gemma 3 1B** – Google’s 1 billion‑parameter model.  The Gemma 3 family
       offers open weights in multiple sizes and quantised checkpoints that
       require as little as ~900 MB of VRAM at 4‑bit precision【82067781623453†L360-L384】.

     * **Mistral 7B / Zephyr 7B** – Larger models with strong conversational
       abilities; quantised versions make them usable on machines with 8 GB of
       VRAM【6841857207177†L241-L259】【6841857207177†L261-L287】.

   When using a model from the Hugging Face hub, ensure you comply with the
   licence agreements.  To download `phi-3-mini-4k-instruct`, specify the model
   ID when running the script or set the `MODEL_ID` environment variable.

3. **Run the game**

   Launch the script from the command line.  On the first run the model will
   be downloaded from the internet; subsequent runs load the model from the
   local cache:

   ```bash
   python ai_tamagotchi.py --model microsoft/phi-3-mini-4k-instruct
   ```

   The game maintains state between sessions by saving a JSON file in the
   current directory.  If you want to start over, delete the `ai_state.json`
   file.

How It Works
------------

* **Game state** – An instance of `GameState` tracks the AI’s XP and level.
  Every time you send a message to the AI, the script awards a small amount
  of XP.  You can grant additional XP by prefacing your message with
  `teach:` to indicate that you are deliberately teaching the AI; this awards
  extra XP and encourages knowledge sharing.  The XP threshold for leveling
  up scales linearly with the level.

* **Conversation history** – A simple chat transcript is maintained and
  passed to the model each turn.  This ensures the AI has context for the
  conversation.  If the transcript grows too long it is truncated to stay
  within the model’s context window.

* **Language model** – The script uses Hugging Face’s `AutoModelForCausalLM`
  and `AutoTokenizer` to load the chosen model with quantisation.  When
  generating responses it concatenates the conversation into a single prompt
  following a naive role‑play template.  For more advanced system prompts
  consider using the model’s built‑in chat template.

This code is provided as a learning example.  Feel free to adapt it by
adding new commands, emotional attributes, mini‑games, or a richer XP system.
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from typing import List, Tuple

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    logging as transformers_logging,
)


@dataclass
class GameState:
    """Simple class to track the AI avatar's experience and level."""

    xp: int = 0
    level: int = 1
    history: List[Tuple[str, str]] = field(default_factory=list)
    state_file: str = "ai_state.json"

    def load(self) -> None:
        """Load state from a JSON file if it exists."""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.xp = data.get("xp", 0)
                    self.level = data.get("level", 1)
                    self.history = [tuple(h) for h in data.get("history", [])]
            except Exception as e:
                print(f"Warning: Failed to load state: {e}")

    def save(self) -> None:
        """Persist state to a JSON file."""
        data = {
            "xp": self.xp,
            "level": self.level,
            "history": self.history,
        }
        try:
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Failed to save state: {e}")

    def gain_xp(self, amount: int) -> None:
        """Add experience points and level up if threshold is met."""
        self.xp += amount
        # simple linear level up: threshold = 100 * current level
        while self.xp >= self.level * 100:
            self.xp -= self.level * 100
            self.level += 1
            print(f"🎉 Your AI has reached level {self.level}! 🎉")

    def append_history(self, role: str, content: str) -> None:
        self.history.append((role, content))

    def get_transcript(self, max_turns: int = 20) -> str:
        """Return the last `max_turns` conversation turns formatted as a prompt."""
        # Only keep the last `max_turns` messages to stay within context window
        recent = self.history[-max_turns:]
        transcript = ""
        for role, content in recent:
            transcript += f"{role.capitalize()}: {content}\n"
        transcript += "Assistant:"
        return transcript


def load_model(model_name: str, device: str = "auto") -> Tuple[AutoModelForCausalLM, AutoTokenizer]:
    """Load a causal language model with 8‑bit quantisation by default."""
    # Configure bitsandbytes quantisation.  8‑bit is a good trade‑off between
    # memory and speed; adjust to 4‑bit (`load_in_4bit=True`) for even lower
    # memory usage at the cost of some performance.
    bnb_config = BitsAndBytesConfig(load_in_8bit=True)
    print(f"Loading model '{model_name}'… this may take a few minutes on first run.")
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map=device,
        trust_remote_code=True,
    )
    model.eval()
    return model, tokenizer


def generate_response(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    prompt: str,
    max_new_tokens: int = 200,
    temperature: float = 0.7,
) -> str:
    """Generate a response from the model given a text prompt."""
    inputs = tokenizer(prompt, return_tensors="pt")
    input_ids = inputs["input_ids"].to(model.device)
    attention_mask = inputs.get("attention_mask", None)
    if attention_mask is not None:
        attention_mask = attention_mask.to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=temperature,
            pad_token_id=tokenizer.eos_token_id,
        )
    # Remove the prompt tokens
    generated_ids = outputs[0][input_ids.shape[-1] :]
    response = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    return response


def main() -> None:
    parser = argparse.ArgumentParser(description="AI Tamagotchi Game")
    parser.add_argument(
        "--model",
        type=str,
        default=os.environ.get("MODEL_ID", "microsoft/phi-3-mini-4k-instruct"),
        help="Hugging Face model ID to use",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        help="Device map for model loading (auto, cpu, cuda)",
    )
    args = parser.parse_args()

    # Suppress HF logging to keep the console clean
    transformers_logging.set_verbosity_error()

    # Load or initialise game state
    state = GameState()
    state.load()

    # Load model and tokenizer
    try:
        model, tokenizer = load_model(args.model, device=args.device)
    except Exception as e:
        print(f"Failed to load model: {e}")
        sys.exit(1)

    print(
        "Welcome to AI Tamagotchi! Teach your AI by chatting with it. Type 'exit' to quit or 'status' to see your AI's stats. Prefix messages with 'teach:' to award extra XP."
    )

    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye! Your progress has been saved.")
            state.save()
            break
        if user_input.lower() == "status":
            print(f"Level: {state.level}, XP: {state.xp}/{state.level * 100}")
            continue

        # Determine XP gain
        extra_xp = 0
        msg_content = user_input
        if user_input.lower().startswith("teach:"):
            extra_xp = 25  # reward teaching
            msg_content = user_input[len("teach:"):].strip()
            print("You taught the AI something new! +25 XP")
        # Append user message to history
        state.append_history("user", msg_content)

        # Build prompt and generate AI response
        prompt = state.get_transcript(max_turns=20)
        try:
            ai_reply = generate_response(model, tokenizer, prompt)
        except Exception as e:
            print(f"Error generating response: {e}")
            ai_reply = "I'm having trouble thinking right now."
        print(f"AI: {ai_reply}")
        # Append AI reply to history
        state.append_history("assistant", ai_reply)
        # Award base XP for interaction
        state.gain_xp(10 + extra_xp)
        # Save state after each turn
        state.save()


if __name__ == "__main__":
    main()
