# Agent Pipeline Workflow

> **To render in VS Code:** Install the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension, then reopen preview (Cmd+Shift+V).

## Full Pipeline Flow

```mermaid
flowchart TD
    UPLOAD(["Upload PDF/DOCX"])
    UPLOAD -->|multipart form| A1

    subgraph A1_box [" 1 - Document Extractor "]
        A1["Code Agent\npdftoppm / mammoth\nCost: $0.00"]
    end

    A1 -->|extractedDocument| A2_flash

    subgraph A2_box [" 2 - Vision Analyzer "]
        A2_flash["Gemini Flash\nper-page analysis"]
        A2_check{Escalation needed?}
        A2_pro["Gemini Pro\nre-analyze page"]
        A2_out["pageExtractions"]
        A2_flash --> A2_check
        A2_check -->|No| A2_out
        A2_check -->|Yes| A2_pro --> A2_out
    end

    A2_out -->|pageExtractions| A3

    subgraph A3_box [" 3 - Instruction Composer "]
        A3["Gemini Flash\nCost: ~$0.02"]
    end

    A3 -->|composedGuide| A4

    subgraph A4_box [" 4 - Guideline Enforcer "]
        A4["Gemini Flash\n+ full WI YAML\nCost: ~$0.03"]
        A4_pp["Post-Processor\n9 deterministic transforms"]
        A4 --> A4_pp
    end

    A4_pp -->|enforcedGuide| A5
    A4_pp -->|enforcedGuide| A6

    subgraph REVIEW [" 5+6 - Parallel Review "]
        A5["5: Quality Reviewer\nGemini Pro ~$0.08"]
        A6["6: Safety Reviewer\nGemini Pro ~$0.04"]
    end

    A5 --> SCORE
    A6 --> SCORE

    subgraph GATE [" Quality Gate "]
        SCORE["Weighted Score\n70% quality + 30% safety"]
        DECIDE{Score?}
        SCORE --> DECIDE
    end

    DECIDE -->|">=85 APPROVED"| A7_loop
    DECIDE -->|"70-84 REVISE"| FEEDBACK
    DECIDE -->|"<70 HOLD"| HOLD(["HOLD\nManual review needed"])

    subgraph REVISION [" Revision Loop - max 2x "]
        FEEDBACK["Feedback from\nQuality + Safety"]
        RE_ENFORCE["Agent 4 re-run\nwith feedback"]
        FEEDBACK --> RE_ENFORCE
    end

    RE_ENFORCE -->|revised guide| A5
    RE_ENFORCE -->|revised guide| A6
    RE_ENFORCE -.->|"loop >= 2, skip"| A7_loop

    subgraph A7_box [" 7 - Illustration Generator "]
        A7_loop["For each step"]
        A7_gen["Gemini Flash Image\n$0.04 per image"]
        A7_save["Save PNG to storage"]
        A7_loop --> A7_gen --> A7_save
    end

    A7_save -->|illustrations| A8

    subgraph A8_box [" 8 - XML Assembler "]
        A8["Code Agent\nXML Builder\nCost: $0.00"]
    end

    A8 --> OUTPUT(["Completed\nXML + Illustrations"])

    SSE["SSE Stream\nagent:start / progress / complete\npipeline:cost"]
    A1_box -.->|events| SSE
    A2_box -.->|events| SSE
    A3_box -.->|events| SSE
    A4_box -.->|events| SSE
    REVIEW -.->|events| SSE
    A7_box -.->|events| SSE
    A8_box -.->|events| SSE

    classDef codeAgent fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#000
    classDef flashAgent fill:#cce5ff,stroke:#004085,stroke-width:2px,color:#000
    classDef proAgent fill:#f8d7da,stroke:#721c24,stroke-width:2px,color:#000
    classDef imageAgent fill:#e2d5f1,stroke:#6f42c1,stroke-width:2px,color:#000
    classDef gate fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#000
    classDef endpoint fill:#e2e3e5,stroke:#6c757d,stroke-width:2px,color:#000
    classDef sse fill:#fff9c4,stroke:#f9a825,stroke-width:1px,color:#000

    class A1,A8 codeAgent
    class A2_flash,A3,A4,A4_pp flashAgent
    class A2_pro,A5,A6 proAgent
    class A7_gen imageAgent
    class DECIDE,SCORE gate
    class UPLOAD,OUTPUT,HOLD endpoint
    class SSE sse
```

## Pipeline States

```mermaid
stateDiagram-v2
    [*] --> pending : Job created

    pending --> extracting : Pipeline starts
    extracting --> analyzing : Agent 1 done
    analyzing --> composing : Agent 2 done
    composing --> enforcing : Agent 3 done
    enforcing --> reviewing : Agent 4 done

    reviewing --> illustrating : APPROVED
    reviewing --> revising : REVISE
    revising --> reviewing : Re-review
    revising --> illustrating : Max loops reached

    illustrating --> assembling : Agent 7 done
    assembling --> completed : Agent 8 done

    pending --> cancelled : Cancel
    extracting --> cancelled : Cancel
    analyzing --> cancelled : Cancel
    composing --> cancelled : Cancel
    enforcing --> cancelled : Cancel
    reviewing --> cancelled : Cancel
    illustrating --> cancelled : Cancel

    extracting --> failed : Error
    analyzing --> failed : Error
    composing --> failed : Error
    enforcing --> failed : Error
    reviewing --> failed : Error
    illustrating --> failed : Error
    assembling --> failed : Error

    failed --> extracting : Retry from checkpoint

    completed --> [*]
    cancelled --> [*]
```

## Data Flow Between Agents

```mermaid
flowchart LR
    PDF["PDF / DOCX"] --> A1
    A1["1: Extractor\npages + text"] --> A2
    A2["2: Vision\nsteps per page"] --> A3
    A3["3: Composer\nunified guide"] --> A4
    A4["4: Enforcer\napproved verbs\nstructured parts"] --> A56
    A56["5+6: Review\nscore + issues"] --> A7
    A7["7: Illustrator\nPNG per step"] --> A8
    A8["8: Assembler\nCanonical XML"]

    classDef input fill:#e2e3e5,stroke:#6c757d,color:#000
    classDef code fill:#d4edda,stroke:#28a745,color:#000
    classDef flash fill:#cce5ff,stroke:#004085,color:#000
    classDef pro fill:#f8d7da,stroke:#721c24,color:#000
    classDef image fill:#e2d5f1,stroke:#6f42c1,color:#000

    class PDF input
    class A1,A8 code
    class A2,A3,A4 flash
    class A56 pro
    class A7 image
```

## Cost Breakdown (24-page PDF)

```
Agent 1  Document Extractor   ██                                    $0.00  (code)
Agent 2  Vision Analyzer      ██████                                $0.06  (Flash + Pro)
Agent 3  Instruction Composer ████                                  $0.02  (Flash)
Agent 4  Guideline Enforcer   █████                                 $0.03  (Flash)
Agent 5  Quality Reviewer     ████████                              $0.08  (Pro)
Agent 6  Safety Reviewer      ██████                                $0.04  (Pro)
Agent 7  Illustration Gen.    ██████████████████████████████████████ $0.70  (Flash Image)
Agent 8  XML Assembler        ██                                    $0.00  (code)
                                                                   ──────
                                                            Total  ~$0.93
```
