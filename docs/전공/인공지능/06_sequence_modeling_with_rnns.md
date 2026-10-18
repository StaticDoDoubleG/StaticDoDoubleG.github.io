# Sequence Modeling with RNNs, LSTMs, and GRUs

## 1. When Order Carries Meaning

일반적인 이미지 분류에서는 특징의 순서보다 공간 관계가 중요하지만, 시퀀스에서는 순서가 의미를 바꾼다. `Man bites dog`와 `Dog bites man`은 같은 단어를 포함해도 의미가 다르다. 문장, 음성, 센서 기록은 길이도 일정하지 않다.

입출력 형태는 다음처럼 나눌 수 있다.

- **One-to-many**: 이미지 하나에서 설명 문장 생성
- **Many-to-one**: 문장 전체에서 감정 클래스 하나 예측
- **Many-to-many**: 한 시퀀스를 다른 시퀀스로 번역

## 2. RNN Memory

RNN은 현재 입력과 이전 hidden state를 결합해 현재 상태를 만든다.

$$h_t=\tanh(W_hh_{t-1}+W_xx_t+b_h)$$
$$y_t=f(W_yh_t+b_y)$$

$h_t$는 지금까지 읽은 내용을 요약하는 내부 메모리다. 같은 가중치를 모든 시간 단계에 공유하므로 길이가 달라도 적용할 수 있고 파라미터 수도 시퀀스 길이에 비례해 늘지 않는다.

예를 들어 문장을 단어 단위로 넣으면 첫 단어의 정보가 hidden state에 들어가고, 다음 단어를 읽을 때 이전 상태와 현재 단어를 함께 사용해 갱신한다. 마지막 상태는 문장 전체의 요약처럼 사용할 수 있다.

## 3. BPTT and Long-Term Dependencies

RNN을 시간축으로 펼치면 시퀀스 길이만큼 깊은 네트워크가 된다. **Backpropagation Through Time**은 각 시간 단계의 오류를 이전 단계로 전파한다. 작은 미분값이 반복해서 곱해지면 초기 단어에 대한 gradient가 사라진다.

그 결과 긴 문장에서 앞부분 정보가 뒤로 갈수록 희석되고, 모델이 장기 의존 관계를 학습하기 어려워진다. 깊은 네트워크에서 발생한 gradient vanishing이 시간축에서도 반복되는 셈이다.

## 4. LSTM Architecture

LSTM은 hidden state만으로 부족한 장기 메모리를 위해 별도의 cell state $c_t$와 게이트를 둔다. 게이트는 sigmoid로 0과 1 사이의 통과 비율을 정한다.

- **Forget gate**: 이전 cell memory 중 버릴 양
- **Input gate**: 새 정보를 저장할 양
- **Output gate**: cell state 중 hidden state로 내보낼 양

$$i_t=\sigma(W_{xi}x_t+W_{hi}h_{t-1}+b_i)$$
$$g_t=\tanh(W_{xg}x_t+W_{hg}h_{t-1}+b_g)$$
$$f_t=\sigma(W_{xf}x_t+W_{hf}h_{t-1}+b_f)$$
$$c_t=f_t\odot c_{t-1}+i_t\odot g_t$$
$$o_t=\sigma(W_{xo}x_t+W_{ho}h_{t-1}+b_o),\quad h_t=o_t\odot\tanh(c_t)$$

cell state는 정보를 그대로 운반하는 비교적 직접적인 경로를 제공하고, 게이트가 필요한 정보만 지우고 더한다. 따라서 긴 의존 관계를 vanilla RNN보다 잘 보존한다. 대신 게이트와 상태가 많아 계산량과 파라미터 수가 크다.

## 5. GRU Architecture

GRU는 cell state를 별도로 두지 않고 hidden state에 메모리를 통합한다. LSTM의 세 게이트 대신 두 게이트를 사용한다.

- **Reset gate** $r_t$: 새 후보를 계산할 때 과거를 얼마나 무시할지 결정
- **Update gate** $z_t$: 이전 상태와 새 후보를 얼마나 섞을지 결정

$$r_t=\sigma(W_r[h_{t-1},x_t]),\quad z_t=\sigma(W_z[h_{t-1},x_t])$$
$$\tilde h_t=\tanh(W[r_t\odot h_{t-1},x_t])$$
$$h_t=(1-z_t)\odot h_{t-1}+z_t\odot\tilde h_t$$

구조가 단순하고 파라미터가 적어 LSTM보다 빠를 수 있다. 어떤 모델이 항상 우월한 것이 아니라 데이터 크기, 시퀀스 길이, 계산 예산에 따라 선택한다.

## 6. Word Embeddings

신경망은 문자열을 그대로 처리하지 못하므로 토큰을 벡터로 바꾼다. 비슷한 단어는 벡터 공간에서 가까운 위치에 놓이도록 학습할 수 있다.

- Word2Vec, GloVe, FastText: 단어마다 비교적 고정된 벡터
- 다의어 문제: `bank`가 은행인지 강둑인지 문맥을 반영하기 어렵다.
- Transformer 계열: self-attention으로 문맥에 따라 토큰 표현을 동적으로 바꾼다.

이처럼 RNN/LSTM은 순서대로 상태를 갱신하고, Transformer는 모든 토큰 관계를 attention으로 계산하는 방향으로 발전한다.
