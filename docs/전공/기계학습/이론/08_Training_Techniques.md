# 학습 기법

## 1. SGD와 Momentum
SGD는
$$\theta\leftarrow\theta-\eta\nabla_\theta J$$
로 현재 gradient만 사용한다. 미니배치 잡음 때문에 진동하거나 최적 방향과 다르게 움직일 수 있다.

Momentum은 과거 이동량을 누적한다.
$$v_t=\gamma v_{t-1}+\eta\nabla J(\theta_t),\qquad\theta_{t+1}=\theta_t-v_t$$
같은 방향은 가속하고 좌우 진동은 줄인다.

## 2. AdaGrad와 RMSProp
AdaGrad는 제곱 gradient를 계속 누적해 파라미터별 학습률을 조절한다. 자주 변한 파라미터의 보폭을 줄이지만 누적값이 계속 커져 학습이 멈출 수 있다.

RMSProp은 제곱 gradient의 지수 이동 평균을 사용한다.
$$h\leftarrow\gamma h+(1-\gamma)g^2,\qquad W\leftarrow W-\eta g/\sqrt h$$
최근 gradient를 중시하고 $h$가 무한히 증가하는 것을 완화하지만 Momentum처럼 방향을 기억하지는 않는다.

## 3. Adam
Adam은 Momentum의 1차 모멘트와 RMSProp의 2차 모멘트를 결합한다.
$$m\leftarrow\beta_1m+(1-\beta_1)g$$
$$v\leftarrow\beta_2v+(1-\beta_2)g^2$$
초기 $m,v$가 0인 편향을 보정한 후 업데이트한다. 기본 계수로 $\beta_1=0.9,\beta_2=0.999$가 흔하다.

## 4. 가중치 초기화
Xavier는 Sigmoid/Tanh, He는 ReLU 계열과 잘 맞는다. 모든 가중치를 같은 값으로 두면 뉴런 대칭성이 유지되어 서로 다른 특징을 배우지 못한다. 너무 큰 초기값은 exploding gradient, 너무 작은 초기값은 vanishing gradient를 유발한다.

## 5. 과적합 억제
- **Weight decay/L2**: $L+\lambda\sum w^2$로 큰 가중치를 벌점.
- **Dropout**: 학습 중 일부 뉴런 출력을 비활성화해 특정 경로 의존을 줄임. 가중치 자체를 영구 삭제하는 것은 아니다.
- **Batch normalization**: 미니배치의 중간 활성값을 정규화해 학습을 안정화.
- **Early stopping/validation**: validation 성능이 악화되기 전에 학습을 멈춤.

`last.md`의 핵심은 Hidden Layer, L2/L1 norm, ReLU를 통한 gradient vanishing 완화, Softmax 안정화, batch/validation, loss 조합, backprop, optimizer, Xavier/He, overfitting을 하나의 학습 파이프라인으로 연결하는 것이다.

## 6. 초기화와 활성화의 조합

모든 weight를 0으로 두면 같은 층의 뉴런이 같은 값을 출력하고 같은 gradient를 받아 서로 다른 특징을 학습하지 못한다. 무작위 초기화는 이 대칭을 깨지만, 분산을 잘못 고르면 신호가 층을 지나며 사라지거나 폭발한다.

Xavier는 Sigmoid/Tanh처럼 양방향으로 값이 변하는 활성화에, He는 ReLU 계열에 맞춘다.
$$\mathrm{Var}(W)\approx\frac{2}{n_{in}+n_{out}}\quad\text{(Xavier)}$$
$$\mathrm{Var}(W)\approx\frac{2}{n_{in}}\quad\text{(He)}$$

## 7. 정규화와 일반화

L2 정규화는
$$L'=L+\lambda\sum_iw_i^2$$
처럼 큰 weight를 벌점으로 둔다. Dropout은 학습 중 일부 출력만 비활성화하고, BatchNorm은 batch의 중간 활성값을 정규화한다. 서로 같은 기법은 아니므로 적용 위치와 train/eval 동작을 따로 기록한다.

과적합은 train loss가 계속 내려가는데 validation loss가 다시 올라가는 패턴으로 관찰할 수 있다. 이때 모델을 더 오래 학습하는 대신 early stopping, weight decay, dropout, 데이터 확장, 모델 축소 중 무엇이 적합한지 validation 결과로 판단한다.

## 8. 옵티마이저 선택 기록

SGD는 현재 gradient만 사용하고, Momentum은 방향의 누적을 추가한다. AdaGrad는 과거 제곱 gradient를 계속 누적해 feature별 보폭을 줄인다. RMSProp은 그 누적을 지수 이동 평균으로 바꾸고, Adam은 방향 평균과 제곱 gradient 평균을 함께 유지한다.

따라서 “Adam이 가장 좋다”로 기록하지 않는다. 데이터 규모, noise, learning rate, 일반화 성능에 따라 결과가 달라진다. optimizer와 함께 learning curve, 최종 validation/test metric, 학습 시간, seed를 남겨야 비교가 가능하다.
