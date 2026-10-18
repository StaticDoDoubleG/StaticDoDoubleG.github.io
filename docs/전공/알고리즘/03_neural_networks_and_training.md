# 3. Neural Network Computation and Training

## Perceptrons and Neurons
사람들은 지능을 모사하기 위해 생체 뉴런을 본따 뉴런 모델을 만들었다.
이렇게 만들어진 인공 뉴런은 입력의 가중합에 편향을 더한 뒤 활성화 함수를 적용한다.

$$z=w^Tx+b, \qquad a=f(z)$$

- $x$: 입력 특징
- $w$: 특징별 중요도를 나타내는 가중치
- $b$: 기준점을 이동하는 편향
- $f$: 비선형 활성화 함수

퍼셉트론은 임계값 기반으로 입력을 두 클래스에 나누는 가장 단순한 신경망이다. 선형적으로 분리 가능한 AND 같은 문제는 처리할 수 있지만 XOR처럼 하나의 직선으로 나눌 수 없는 문제는 해결하지 못한다.

## 2. MLPs and Nonlinearity

MLP는 입력층, 은닉층, 출력층을 연결한다. 은닉층을 여러 개 쌓으면 각 층이 앞 층의 표현을 다시 변환한다. 활성화 함수가 없다면 여러 선형층을 겹쳐도 하나의 선형 변환으로 합쳐지므로 복잡한 함수가 되지 않는다. 따라서 비선형 활성화가 필요하다.

- **Step**: 임계값을 기준으로 0 또는 1. 미분 기반 학습에는 부적합하다.
- **Sigmoid**: $(0,1)$ 범위의 값. 확률 해석이 쉽지만 큰 양·음의 입력에서 기울기가 작다.
- **Tanh**: $(-1,1)$ 범위이고 0 중심이지만 포화 영역에서 gradient가 작다.
- **ReLU**: $\max(0,x)$. 계산이 간단하고 양의 입력에서 기울기가 1이지만 음의 영역에서 dead neuron이 생길 수 있다.
- **Softmax**: 여러 logit을 합이 1인 클래스 확률로 바꾼다.

## 3. Loss Functions

손실은 예측이 정답과 얼마나 다른지 측정하고, 학습 방향을 제공한다.

### MSE

회귀에서 자주 사용한다.

$$MSE=\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat y_i)^2$$

오차를 제곱하기 때문에 큰 오차와 이상치의 영향이 커진다. 이는 큰 오류를 강하게 줄이고 싶을 때는 장점이지만, 이상치가 측정 오류라면 모델을 잘못 끌고 갈 수 있다.

### Cross-Entropy

분류에서 정답 클래스에 높은 확률을 주도록 한다. 정답 확률이 0에 가까우면 로그가 매우 큰 손실을 만들므로 실제 구현에서는 작은 epsilon을 더하는 등 수치 안정화가 필요하다.

## 4. Forward Pass and Backpropagation

**Forward pass**는 입력을 층별로 통과시켜 예측을 만든다. **Backpropagation**은 예측 손실을 출력층에서 입력층 방향으로 전파하며 각 파라미터가 손실에 미친 영향을 계산한다.

연쇄법칙에 의해 여러 미분을 곱한다.

$$\frac{\partial L}{\partial w}=\frac{\partial L}{\partial a}\frac{\partial a}{\partial z}\frac{\partial z}{\partial w}$$

계산한 gradient로 파라미터를 갱신한다.

$$\theta \leftarrow \theta-\eta\nabla_\theta L(\theta)$$

여기서 $\eta$는 learning rate다. 너무 크면 최솟값을 지나치고, 너무 작으면 학습이 매우 느리거나 실용적인 시간 안에 수렴하지 않는다.

## 5. Optimization Methods

- **Batch Gradient Descent**: 전체 학습 데이터로 한 번 업데이트한다. gradient가 안정적이지만 데이터가 크면 한 번의 계산이 무겁다.
- **SGD**: 샘플 하나 또는 작은 미니배치로 업데이트한다. 빠르고 noise가 있지만, 그 noise가 나쁜 지역에서 벗어나는 데 도움을 줄 수 있다.
- **Adam**: gradient의 이동 평균(momentum)과 크기별 적응적 학습률을 함께 사용한다. 파라미터별로 다른 보폭을 정해 실무의 기본 optimizer로 자주 사용된다.

## 6. Overfitting and Regularization

과적합은 학습 데이터의 손실은 낮지만 실제 데이터의 손실은 높은 상태다. 모델이 데이터의 일반적인 구조가 아니라 특정 샘플의 우연한 잡음까지 외운 결과다.

- **L1**: 가중치 절댓값에 패널티를 주어 일부 가중치를 0에 가깝게 만든다. 희소 표현을 유도한다.
- **L2**: 가중치 제곱에 패널티를 주어 큰 가중치를 억제하고 부드러운 해를 선호한다.
- **Dropout**: 학습 중 뉴런을 무작위로 끄므로 특정 뉴런 조합에 대한 의존을 줄인다.
- **Early Stopping**: 검증 손실이 더 이상 개선되지 않으면 학습을 멈춘다.

## Example Training Cycle

이미지 분류 모델이 고양이 확률을 0.2로 예측했는데 정답이 고양이라면, forward pass에서 이 예측을 만들고 cross-entropy가 큰 값을 낸다. backward pass는 출력 확률을 높이는 방향의 gradient를 앞 층까지 전달한다. optimizer는 가중치를 조금 바꾸고, 다음 미니배치에서 더 나은 표현을 시도한다.
