# 4. Deep Learning and Training Stability

## 1. Depth and Hierarchical Representation

딥러닝은 여러 층이 표현을 단계적으로 추상화하는 방식이다. 이미지라면 앞쪽 층이 모서리와 선을, 중간 층이 부분과 형태를, 뒤쪽 층이 객체의 의미를 학습할 수 있다. 사람이 모든 특징을 설계하지 않고 원시 입력에서 출력까지 학습하는 것이 전통적 머신러닝과의 큰 차이다.

깊은 모델은 표현력이 크지만 대규모 데이터와 GPU 계산이 필요하고, 내부 판단 과정을 해석하기 어렵다는 비용이 있다.

## 2. Vanishing Gradients

역전파의 gradient는 층마다 미분값이 곱해져 앞쪽으로 전달된다. 각 미분값이 1보다 작으면 깊이가 커질수록 곱이 0에 가까워진다. 그러면 앞쪽 층의 파라미터가 거의 업데이트되지 않아 학습이 멈춘다.

시그모이드나 tanh의 포화 영역에서 기울기가 작아지는 것이 대표적인 원인이다. 반대로 gradient가 지나치게 커지는 exploding gradient도 있어 초기화와 정규화가 중요하다.

## 3. Stabilization Techniques

### Weight Initialization

초기 가중치의 분산이 층을 통과하며 과도하게 커지거나 작아지지 않도록 한다.

- **Xavier/Glorot**: sigmoid나 tanh 계열에 적합하다.
- **He initialization**: ReLU가 음수 입력을 제거하는 특성을 고려해 ReLU 계열에 적합하다.

### ReLU and Non-Saturating Activations

ReLU는 양의 입력에서 기울기가 1이라 sigmoid보다 gradient 소실이 적다. 다만 어떤 뉴런이 계속 음의 입력만 받아 출력과 gradient가 0이 되는 dead ReLU가 생길 수 있다.

### Residual Connection

블록의 입력을 변환 결과에 직접 더한다.

$$y=F(x)+x$$

변환 $F$가 학습되지 않더라도 입력을 전달하는 경로가 남아 있어 깊은 네트워크의 gradient 흐름을 돕는다. ResNet이 이 구조를 대표적으로 사용한다.

### Batch Normalization

미니배치의 평균과 분산으로 층 입력을 정규화한 뒤 학습 가능한 $\gamma,\beta$로 다시 스케일한다.

$$\hat x=\frac{x-\mu_B}{\sqrt{\sigma_B^2+\epsilon}}, \qquad y=\gamma\hat x+\beta$$

활성화가 포화 영역에 몰리는 것을 줄이고 학습을 안정화한다. BatchNorm은 배치 통계를 사용한다는 점에서 샘플별 특징을 정규화하는 LayerNorm과 다르다.

## 4. Data Augmentation

데이터가 부족하거나 모델이 학습 샘플을 외울 때, 원본에 의미를 보존하는 변형을 적용해 학습 분포를 넓힌다. 보통 변형 이미지를 모두 저장하기보다 학습 중 무작위로 생성한다.

- **기하 변환**: 좌우 반전, 작은 회전, crop/resize, 이동
- **광도·잡음 변환**: 밝기, 대비, 채도, 색조, blur, Gaussian noise
- **Cutout**: 일부 영역을 가려 특정 특징 하나에 의존하지 못하게 한다.
- **Mixup**: 두 샘플과 레이블을 선형 결합한다.
  $$x=\lambda x_a+(1-\lambda)x_b$$
- **CutMix**: 한 이미지의 패치를 다른 이미지에 붙이고 면적 비율에 따라 레이블을 섞는다.

변형이 실제 문제의 불변성을 반영해야 한다. 예를 들어 숫자 인식에서 좌우 반전은 의미를 바꿀 수 있으므로 모든 데이터에 무조건 적용하면 안 된다.

## 5. Synthetic Data and TTA

GAN이나 diffusion model로 합성 데이터를 만들 수 있다. 그러나 생성 데이터만 반복 사용하면 실제 분포가 아니라 생성 모델의 편향을 학습하는 model collapse 위험이 있다.

**Test Time Augmentation**은 추론 시에도 입력을 여러 형태로 변환하고 예측을 평균 또는 투표한다. 모델을 여러 개 학습하지 않고 앙상블 비슷한 안정성을 얻지만, 변형 수만큼 추론 시간이 증가한다.

## Practical Diagnostic Criteria

- 깊이를 늘렸는데 학습 손실도 내려가지 않으면 gradient 흐름, 초기화, 활성화 함수를 점검한다.
- 학습 손실만 낮고 검증 손실이 높으면 augmentation, dropout, weight decay, early stopping을 검토한다.
- augmentation은 “더 다양한 데이터”가 목적이지 무작위 왜곡 자체가 목적이 아니다.
