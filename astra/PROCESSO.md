# Como o GPT-6.2 Astra fez a Serra do Lume

Em 17 de novembro de 2026, rodei o GPT-6.2 Astra no Codex em esforço Ultra com [o mesmo pedido do Fable e do Opus](../pedidos/01-circuito.txt). O Astra dividiu a construção do carro, da pista e do renderizador entre subagentes. A cada rodada, um crítico novo avaliava seis poses do Uno, amostras da volta e sequências de quadros consecutivos. Ele tinha as imagens e as referências visuais para comparar.

| Rodada | Defeitos graves | O que o crítico viu |
|---|---:|---|
| 1 | 3 | A carroceria parecia uma miniatura em três poses. O reflexo na pista molhada quase duplicava o carro. |
| 8 | 1 | A frente do carro ainda chamava atenção pelos faróis quadriculados e pela borda fina do capô. |
| 12 | 0 | Primeiro zero. O contorno do carro e da escada se manteve estável. Faróis, spray e arquibancada ainda receberam apontamentos. |
| 13 | 1 | Os faróis e a grade voltaram a receber uma avaliação grave. |
| 17 | 1 | A pintura dava à chapa lateral um aspecto ondulado. |
| 19 | 0 | Restaram três defeitos médios, nos vincos laterais, na leitura da cabine através dos vidros e no brilho dos para-choques. As lanternas renderam o único defeito menor. |

Graves em cada rodada, da primeira à última: `3, 3, 2, 2, 2, 2, 1, 1, 2, 2, 2, 0, 1, 0, 0, 0, 1, 0, 0`.

O teste levou **6 h 49 min de trabalho do agente**, com **19 rodadas** e custo equivalente a **US$ 371,02** em preço de API. Depois da rodada 18, pedi para parar na próxima versão sem defeito grave. O teste foi encerrado quando saiu o parecer da rodada 19. O [`index.html`](index.html) deste repositório é o HTML que o crítico examinou nessa última rodada, com **478.646 bytes**.

## Tempo de GPU

Na volta roteirizada de 60 s, duas medições independentes no MacBook Pro M4 Max a 2560×1440 deram médias de GPU de **6,87 ms** e **7,02 ms**, com 8 e 6 dos 3.600 quadros acima de 16,7 ms, respectivamente. A terceira medição deu 12,61 ms de média e 860 quadros acima do limite, sem causa identificada. O pedido fixava média de até 11 ms e nenhum quadro acima de 16,7 ms.

[Jogar Serra do Lume no navegador](https://viktorkav.com.br/apoio/uno-com-escada/astra/)
