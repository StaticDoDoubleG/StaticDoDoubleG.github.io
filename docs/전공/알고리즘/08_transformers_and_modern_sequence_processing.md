# 8. Transformers and Modern Sequence Processing

## 1. From RNNs to Transformers

RNN은 시점 $t$를 계산하려면 $t-1$의 결과가 필요해 순차 계산을 해야 한다. Transformer는 토큰 사이 관계를 self-attention으로 계산하므로 한 층에서 여러 토큰을 병렬 처리할 수 있다. 긴 시퀀스의 학습을 GPU에 더 잘 맞게 만든 전환이다.

순서를 따라 읽는 RNN과 달리 attention은 입력을 한꺼번에 볼 수 있으므로 순서 정보가 자동으로 생기지 않는다. 이를 보완하기 위해 positional encoding을 토큰 임베딩에 더한다.

$$PE(pos,2i)=\sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

홀수 차원에는 cosine을 사용하는 식으로 위치별 고유한 패턴을 만든다.

## 2. Scaled Dot-Product Attention

Transformer의 기본 연산은 다음과 같다.

$$Attention(Q,K,V)=softmax\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

$QK^T$는 Query와 Key의 관련도 행렬이다. $d_k$로 나누는 이유는 차원이 커질수록 내적값이 커져 softmax가 한 위치에 과도하게 몰리고 gradient가 작아지는 것을 완화하기 위해서다.

## 3. Multi-Head Attention

하나의 attention만 사용하지 않고 여러 head를 병렬로 계산한다. 각 head는 서로 다른 투영 공간에서 문법적 관계, 장거리 의존성, 위치 관계 등 서로 다른 패턴을 학습할 수 있다. 결과를 이어 붙인 뒤 선형 변환해 다음 층으로 보낸다.

## 4. Self-Attention and Cross-Attention

- **Self-attention**: Q, K, V가 같은 시퀀스에서 나온다. 문장 내부 토큰들이 서로를 참조한다.
- **Cross-attention**: Q는 Decoder에서, K와 V는 Encoder 출력에서 나온다. 생성 중 입력 문맥을 참조한다.

## 5. Transformer Encoder and Decoder

### Encoder

각 층은 대체로 다음 구조를 갖는다.

```text
Multi-Head Self-Attention -> Residual + LayerNorm -> FFN -> Residual + LayerNorm
```

Self-attention이 토큰 간 문맥을 만들고, position-wise feed-forward network가 각 위치의 표현을 변환한다.

### Decoder

Decoder는 미래 토큰을 보지 않고 한 토큰씩 생성한다.

1. **Masked self-attention**: 현재까지 생성된 토큰만 참조한다.
2. **Cross-attention**: Encoder 출력에서 입력 문맥을 읽는다.
3. **FFN**: 표현을 변환한다.
4. **Linear + Softmax**: 어휘 전체에 대한 다음 토큰 확률을 계산한다.

마스크된 위치의 score를 softmax 전에 $-\infty$로 만들어 미래 토큰이 선택되지 않게 한다. 그렇지 않으면 학습 중 정답 문장의 뒤쪽 토큰을 미리 보는 cheating이 발생한다.

## 6. Residual Connections and LayerNorm

Residual connection은 다음처럼 입력을 sublayer 출력에 더한다.

$$Output=x+Sublayer(x)$$

깊은 Transformer에서 gradient가 직접 흐를 경로를 제공한다. **LayerNorm**은 각 샘플의 특징 차원을 정규화한다. 여러 샘플의 통계를 사용하는 BatchNorm과 달리 시퀀스 길이와 배치 구성에 덜 의존한다.

## 7. KV Cache

자동회귀 생성에서는 토큰을 하나씩 추가한다. 새 토큰을 계산할 때 과거 토큰의 Key와 Value를 다시 만들면 중복 계산이 생긴다. KV Cache는 이미 계산한 과거 $K,V$를 GPU 메모리에 저장해 재사용한다.

- **Prefill**: 프롬프트 전체를 처리하고 캐시를 만든다.
- **Decode**: 새 토큰의 Q/K/V를 계산하고 이전 캐시에 새 K/V를 추가한다.
- 장점: 과거 K/V의 반복 계산을 줄여 생성 속도를 높인다.
- 비용: 시퀀스가 길어질수록 캐시가 커져 VRAM과 메모리 대역폭을 사용한다.

KV cache는 attention이 과거 토큰을 참조하는 비용 자체를 없애는 것이 아니라, 과거 K/V를 다시 계산하는 비용을 줄이는 장치다.

## 8. Overall Comparison

| 구조 | 정보 처리 | 강점 | 병목 |
|---|---|---|---|
| RNN | 순서대로 hidden state 갱신 | 순차 상태와 짧은 길이에 단순 | 긴 의존성, 병렬화 어려움 |
| LSTM/GRU | 게이트로 메모리 조절 | 장기 의존성 완화 | 순차 계산, 구조 복잡도 |
| Transformer | 토큰 간 attention | 병렬 학습, 전역 문맥 | 긴 문맥의 attention·KV 메모리 |

Transformer는 RNN을 단순히 더 큰 모델로 만든 것이 아니라, 문맥을 전달하는 방식을 순환 상태에서 토큰 간 직접 참조로 바꾼 구조다.
