# Seq2Seq, Generation, Evaluation, and Attention

## 1. Encoder-Decoder Architecture

입력 시퀀스와 출력 시퀀스의 길이가 다를 때 Seq2Seq 구조를 사용한다. 번역, 요약, 질문 응답이 예다.

- **Encoder**: 입력 $x_1,\ldots,x_n$을 읽고 상태를 만든다.
- **Decoder**: 상태를 바탕으로 출력 $y_1,\ldots,y_m$을 순서대로 생성한다.
- `<SOS>`: 생성을 시작하는 토큰
- `<EOS>`: 생성을 끝내는 토큰

Vanilla Seq2Seq에서는 Encoder의 마지막 상태를 Decoder의 초기 상태로 사용한다.

$$s_0=h_n$$

이 고정 길이 벡터를 **context vector**라고 한다.

## 2. The Fixed-Context Bottleneck

입력 문장이 세 단어든 300단어든 같은 크기의 벡터 하나에 담아야 한다. 긴 문장의 앞부분 정보는 순차 갱신 중 희석될 수 있고, Decoder는 생성 도중 Encoder의 원래 상태들을 직접 볼 수 없다. 이 병목 때문에 긴 문장일수록 번역과 요약의 품질이 떨어질 수 있다.

Attention의 핵심 발상은 매 출력 시점마다 필요한 입력 위치를 다시 참고해 그 시점에 맞는 요약을 만드는 것이다. 벡터의 크기는 같아도 내용은 매 단계 달라진다.

## 3. Teacher Forcing

학습 때 Decoder의 이전 예측값 대신 실제 정답 토큰을 다음 입력으로 넣는다. 초기 학습이 안정되고 오류가 매 단계 누적되는 것을 줄일 수 있다.

하지만 추론 때는 정답이 없으므로 자신의 출력을 다시 입력한다. 이 차이를 **training-inference gap**이라고 하며, 학습 때 보지 못한 잘못된 prefix에서 복구하지 못하는 문제가 생길 수 있다.

## 4. Generation Search

- **Greedy search**: 매 순간 확률이 가장 높은 토큰 하나를 선택한다. 빠르지만 초반의 작은 선택이 전체 문장을 망칠 수 있다.
- **Beam search**: 상위 $K$개의 부분 시퀀스를 유지하고 다음 단계에서 확장한다. 더 좋은 전체 시퀀스를 찾을 가능성이 있지만 계산량과 메모리가 증가한다.

생성은 분류처럼 정답 하나를 맞히는 문제가 아니다. 같은 의미를 표현하는 문장이 여러 개이므로 평가도 별도로 설계해야 한다.

## 5. BLEU Evaluation

BLEU는 생성 문장과 참조 문장 사이의 n-gram 정밀도 중첩을 측정한다. unigram뿐 아니라 bigram, trigram 등을 함께 보므로 단어 몇 개가 맞는지보다 구문이 얼마나 겹치는지도 반영한다.

$$BLEU=BP\cdot\exp\left(\sum_{n=1}^{N}w_n\log p_n\right)$$

- $p_n$: n-gram precision
- $w_n$: n-gram 가중치
- $BP$: 너무 짧은 출력에 주는 brevity penalty

정답 문장과 다른 표현을 허용하지만, 의미 자체를 완전히 이해하는 평가라고 볼 수는 없다.

## 6. Computing Attention

Decoder의 현재 상태를 $s_{i-1}$, Encoder의 각 hidden state를 $h_j$라 하자.

1. **Alignment score** $e_{ij}$: 현재 출력과 입력 위치 $j$의 관련도를 계산한다.
2. **Attention weight**를 계산한다.
   $$\alpha_{ij}=\frac{\exp(e_{ij})}{\sum_k\exp(e_{ik})}$$
3. Encoder 상태의 가중합으로 동적 문맥을 만든다.
   $$c_i=\sum_j\alpha_{ij}h_j$$

예를 들어 긴 문장을 번역하다가 현재 출력이 고유명사라면 attention weight가 원문 속 해당 단어 위치에 크게 모일 수 있다. Decoder는 하나의 고정 벡터 대신 매 출력 시점에 원문을 다시 읽는다.

- **Global attention**: 모든 입력 상태를 살펴 정확하지만 비용이 크다.
- **Local attention**: 예측 위치 주변만 살펴 긴 입력에서 효율적일 수 있다.

## 7. The Q, K, V View

Attention은 질문과 정보의 관계를 계산하는 방식으로도 설명할 수 있다.

- **Query**: 지금 무엇을 찾는가. Decoder의 현재 상태
- **Key**: 어떤 정보가 관련 있는지 비교하는 색인
- **Value**: 실제로 가져올 내용

Query와 Key의 유사도를 softmax 가중치로 만든 뒤 Value를 가중합한다. 이 관점은 RNN Seq2Seq의 attention에서 Transformer의 self-attention으로 자연스럽게 확장된다.
